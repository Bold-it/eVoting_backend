import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ResultsService } from './results.service';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';

@Controller('admin/elections/:electionId/results')
@UseGuards(AdminAuthGuard)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get()
  getResults(@Param('electionId') electionId: string) {
    return this.resultsService.getResults(electionId);
  }
}
