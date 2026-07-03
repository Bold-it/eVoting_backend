import { Controller, Get, Param } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ElectionService } from '../election/election.service';

@Controller('public/elections')
export class PublicResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly electionService: ElectionService
  ) {}

  @Get(':id')
  getElection(@Param('id') id: string) {
    return this.electionService.findOne(id);
  }

  @Get(':id/results')
  getResults(@Param('id') id: string) {
    return this.resultsService.getResults(id);
  }
}
