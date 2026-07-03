import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { VoterJwtStrategy } from './strategies/voter-jwt.strategy';

import { MailModule } from '../mail/mail.module';
import { AuditModule } from '../admin/audit/audit.module';

@Module({
  imports: [
    MailModule,
    AuditModule,
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' }, // Default for admin. We can override per sign.
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AdminJwtStrategy, VoterJwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

