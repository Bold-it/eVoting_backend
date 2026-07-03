import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { VotingService } from '../voting/voting.service';
import { CastVoteDto } from '../dto/cast-vote.dto';
import { CurrentVoter } from '../../auth/decorators/current-user.decorator';
import { VoterAuthGuard } from '../../auth/guards/voter-auth.guard';

@Controller('voter/vote')
@UseGuards(VoterAuthGuard)
export class VoteController {
  constructor(private readonly votingService: VotingService) {}

  @Post()
  castVote(@CurrentVoter() voter: any, @Body() castVoteDto: CastVoteDto) {
    return this.votingService.castVote(voter.id, voter.electionId, castVoteDto);
  }
}
