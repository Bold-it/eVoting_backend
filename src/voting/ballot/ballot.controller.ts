import { Controller, Get, UseGuards } from '@nestjs/common';
import { VotingService } from '../voting/voting.service';
import { CurrentVoter } from '../../auth/decorators/current-user.decorator';
import { VoterAuthGuard } from '../../auth/guards/voter-auth.guard';

@Controller('voter/ballot')
@UseGuards(VoterAuthGuard)
export class BallotController {
  constructor(private readonly votingService: VotingService) {}

  @Get()
  getBallot(@CurrentVoter() voter: any) {
    return this.votingService.getBallot(voter.electionId);
  }
}
