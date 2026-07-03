import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ElectionService } from './election.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { CurrentAdmin } from '../../auth/decorators/current-user.decorator';

@Controller('admin/elections')
@UseGuards(AdminAuthGuard)
export class ElectionController {
  constructor(private readonly electionService: ElectionService) {}

  @Post()
  create(@Body() createElectionDto: CreateElectionDto, @CurrentAdmin() admin: any) {
    // Optionally log who created it using admin info
    return this.electionService.create(createElectionDto);
  }

  @Get()
  findAll() {
    return this.electionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.electionService.findOne(id);
  }

  @Get(':id/report')
  generateReport(@Param('id') id: string) {
    return this.electionService.generateReport(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateElectionDto: UpdateElectionDto) {
    return this.electionService.update(id, updateElectionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.electionService.remove(id);
  }
}
