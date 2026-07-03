import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';

@Controller('admin/users')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('super_admin') // Only super admins can manage EC officials
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Post()
  create(@Body() body: { email: string; role: 'super_admin' | 'election_officer' }) {
    return this.userService.create(body.email, body.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
