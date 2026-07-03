import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PositionService } from './position.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Post('elections/:electionId/positions')
  create(@Param('electionId') electionId: string, @Body() createPositionDto: CreatePositionDto) {
    return this.positionService.create(electionId, createPositionDto);
  }

  @Get('elections/:electionId/positions')
  findAll(@Param('electionId') electionId: string) {
    return this.positionService.findAllByElection(electionId);
  }

  @Get('positions/:id')
  findOne(@Param('id') id: string) {
    return this.positionService.findOne(id);
  }

  @Patch('positions/:id')
  update(@Param('id') id: string, @Body() updatePositionDto: UpdatePositionDto) {
    return this.positionService.update(id, updatePositionDto);
  }

  @Delete('positions/:id')
  remove(@Param('id') id: string) {
    return this.positionService.remove(id);
  }
}
