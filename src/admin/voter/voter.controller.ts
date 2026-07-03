import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { VoterService } from './voter.service';
import { BulkUploadVoterDto } from './dto/bulk-upload-voter.dto';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class VoterController {
  constructor(private readonly voterService: VoterService) {}

  @Post('elections/:electionId/voters/bulk')
  bulkUpload(
    @Param('electionId') electionId: string,
    @Body() bulkUploadDto: BulkUploadVoterDto,
  ) {
    return this.voterService.bulkUpload(electionId, bulkUploadDto);
  }

  @Get('elections/:electionId/voters')
  findAll(@Param('electionId') electionId: string) {
    return this.voterService.findAllByElection(electionId);
  }

  @Delete('voters/:id')
  remove(@Param('id') id: string) {
    return this.voterService.remove(id);
  }

  @Delete('elections/:electionId/voters')
  clearVoters(@Param('electionId') electionId: string) {
    return this.voterService.clearAllByElection(electionId);
  }

  @Post('elections/:electionId/tokens/bulk')
  generateTokens(@Param('electionId') electionId: string) {
    return this.voterService.generateTokens(electionId);
  }
}
