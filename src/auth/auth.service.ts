import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as argon2 from 'argon2';
import { AdminLoginDto } from './dto/admin-login.dto';
import { VoterLoginDto } from './dto/voter-login.dto';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../admin/audit/audit.service';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private googleClientId: string;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {
    this.googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
    this.googleClient = new OAuth2Client(this.googleClientId);
    this.logger.log(
      `Google Client ID loaded: ${this.googleClientId ? this.googleClientId.slice(0, 20) + '...' : '❌ MISSING — set GOOGLE_CLIENT_ID in backend/.env!'}`,
    );
  }

  // ──────────────────────────────────────────────
  // SHARED: Verify a Google ID token
  // ──────────────────────────────────────────────
  async verifyGoogleToken(token: string): Promise<string> {
    this.logger.log('Verifying Google token...');

    if (!this.googleClientId) {
      this.logger.error('❌ GOOGLE_CLIENT_ID is not set in backend .env!');
      throw new UnauthorizedException(
        'Server misconfiguration: GOOGLE_CLIENT_ID is missing from .env. Contact the administrator.',
      );
    }

    let ticket: any;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.googleClientId,
      });
    } catch (error) {
      this.logger.error(`❌ Google token verification failed: ${error.message}`);
      throw new UnauthorizedException(
        `Google sign-in was rejected: ${error.message}. Make sure you are using a valid @htu.edu.gh Google account.`,
      );
    }

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      this.logger.error('❌ Google token payload is missing the email field');
      throw new UnauthorizedException('Invalid Google token: no email found in token payload.');
    }

    this.logger.log(
      `✅ Google token OK. Email: ${payload.email} | Domain (hd): ${payload.hd || '(none)'}`,
    );

    // STRICT DOMAIN CHECK — both admin and voter must be @htu.edu.gh
    if (payload.hd !== 'htu.edu.gh' && !payload.email.endsWith('@htu.edu.gh')) {
      this.logger.warn(`❌ Domain rejected: "${payload.email}" is not an @htu.edu.gh account`);
      throw new UnauthorizedException(
        `Access denied: only @htu.edu.gh accounts are permitted. You signed in with "${payload.email}".`,
      );
    }

    return payload.email;
  }

  // ──────────────────────────────────────────────
  // ADMIN: Step 1 — Request token via email
  // ──────────────────────────────────────────────
  async requestAdminToken(googleToken: string) {
    this.logger.log('=== requestAdminToken ===');
    const email = await this.verifyGoogleToken(googleToken);

    let admin = await this.prisma.adminUser.findUnique({ where: { email } });

    if (!admin) {
      this.logger.log(`Admin not found — auto-creating account for ${email}...`);
      admin = await this.prisma.adminUser.create({
        data: { email, role: 'super_admin' },
      });
      this.logger.log(`✅ Admin account created (id: ${admin.id})`);
    } else {
      this.logger.log(`✅ Existing admin found (id: ${admin.id})`);
    }

    // Generate a readable token
    const rawToken = `ADMIN-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const tokenHash = await argon2.hash(rawToken);

    await this.prisma.adminToken.create({
      data: { adminId: admin.id, tokenHash },
    });

    this.logger.log(`✅ Admin token stored in DB`);
    this.logger.log(`\n====================================================`);
    this.logger.log(`🔑 ADMIN TOKEN FOR ${email}: ${rawToken}`);
    this.logger.log(`====================================================\n`);

    // Send email — wrapped so a mail failure never blocks login
    try {
      await this.mailService.sendAdminTokenEmail(email, rawToken);
    } catch (mailErr) {
      this.logger.error(`⚠️ Email failed (token still valid — use terminal): ${mailErr.message}`);
    }

    return {
      success: true,
      message: `Token sent to ${email}. Check your inbox.`,
    };
  }

  // ──────────────────────────────────────────────
  // ADMIN: Step 2 — Verify token and issue JWT
  // ──────────────────────────────────────────────
  async validateAdmin(dto: AdminLoginDto) {
    this.logger.log('=== validateAdmin ===');
    const email = await this.verifyGoogleToken(dto.googleToken);

    const admin = await this.prisma.adminUser.findUnique({ where: { email } });

    if (!admin) {
      this.logger.warn(`❌ No admin account for ${email}`);
      throw new UnauthorizedException(
        `No admin account found for "${email}". Go back to Step 1 and sign in with Google first.`,
      );
    }

    const adminTokens = await this.prisma.adminToken.findMany({
      where: { adminId: admin.id },
    });

    this.logger.log(`Found ${adminTokens.length} token record(s) for ${email}`);

    if (adminTokens.length === 0) {
      throw new UnauthorizedException(
        'No token found for your account. Go back and click "Continue with Google" to request a fresh token.',
      );
    }

    for (const record of adminTokens) {
      const isValid = await argon2.verify(record.tokenHash, dto.token);
      if (isValid) {
        this.logger.log(`✅ Admin token verified for ${email} — issuing JWT`);
        return admin;
      }
    }

    this.logger.warn(`❌ Token mismatch for ${email}`);
    throw new UnauthorizedException(
      'The token you entered is incorrect. Copy it carefully from your email or the terminal logs.',
    );
  }

  async loginAdmin(dto: AdminLoginDto) {
    const admin = await this.validateAdmin(dto);
    // Include email in JWT so AdminShell can display it
    const payload = { sub: admin.id, role: admin.role, email: admin.email };

    // Audit: admin login
    this.auditService.logAction(admin.email, 'ADMIN_LOGIN', 'AUTH', admin.id, { role: admin.role }).catch(() => {});

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '8h' }),
    };
  }

  // ──────────────────────────────────────────────
  // VOTER: Verify token and issue JWT
  // ──────────────────────────────────────────────
  async validateVoter(dto: VoterLoginDto) {
    this.logger.log('=== validateVoter ===');
    const email = await this.verifyGoogleToken(dto.googleToken);

    const voterTokens = await this.prisma.voterToken.findMany({
      where: { voter: { email } },
      include: { voter: true },
    });

    this.logger.log(`Found ${voterTokens.length} voter token(s) for ${email}`);

    if (voterTokens.length === 0) {
      throw new UnauthorizedException(
        `No voting token found for "${email}". Make sure your registered email matches the one in the voter roll.`,
      );
    }

    for (const record of voterTokens) {
      const isValid = await argon2.verify(record.tokenHash, dto.token);
      if (isValid) {
        this.logger.log(`✅ Voter token verified for ${email}`);
        return { voter: record.voter, tokenRecord: record };
      }
    }

    throw new UnauthorizedException(
      'The voting token you entered is incorrect. Copy it exactly from your email.',
    );
  }

  async loginVoter(dto: VoterLoginDto) {
    const { voter } = await this.validateVoter(dto);
    const payload = { sub: voter.id, electionId: voter.electionId };

    // Audit: voter login
    this.auditService.logAction(voter.email, 'VOTER_LOGIN', 'AUTH', voter.id, { electionId: voter.electionId }).catch(() => {});

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '24h' }),
    };
  }
}
