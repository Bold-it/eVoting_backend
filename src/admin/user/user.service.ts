import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService, private mailService: MailService) {}

  async findAll() {
    return this.prisma.adminUser.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });
  }

  async create(email: string, role: 'super_admin' | 'election_officer') {
    const existing = await this.prisma.adminUser.findUnique({
      where: { email },
    });
    
    if (existing) {
      throw new ConflictException('Admin user with this email already exists');
    }

    const admin = await this.prisma.adminUser.create({
      data: {
        email,
        role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });

    // Generate Token
    const rawToken = 'ADMIN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const tokenHash = await argon2.hash(rawToken);

    await this.prisma.adminToken.create({
      data: {
        tokenHash,
        adminId: admin.id,
      }
    });

    await this.mailService.sendAdminTokenEmail(email, rawToken);

    return admin;
  }

  async remove(id: string) {
    // Prevent deleting the last super_admin (safety check)
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    if (admin.role === 'super_admin') {
      const superAdmins = await this.prisma.adminUser.count({ where: { role: 'super_admin' } });
      if (superAdmins <= 1) {
        throw new ConflictException('Cannot delete the last Super Admin');
      }
    }

    return this.prisma.adminUser.delete({
      where: { id },
    });
  }
}
