import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { VoterLoginDto } from './dto/voter-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/request-token')
  @HttpCode(HttpStatus.OK)
  async adminRequestToken(@Body() dto: { googleToken: string }) {
    return this.authService.requestAdminToken(dto.googleToken);
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.loginAdmin(dto);
  }

  @Post('voter/login')
  @HttpCode(HttpStatus.OK)
  async voterLogin(@Body() dto: VoterLoginDto) {
    return this.authService.loginVoter(dto);
  }
}
