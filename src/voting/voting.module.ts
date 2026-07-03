import { Module } from '@nestjs/common';
import { BallotController } from './ballot/ballot.controller';
import { VoteController } from './vote/vote.controller';
import { VotingService } from './voting/voting.service';
import { AuditModule } from '../admin/audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [BallotController, VoteController],
  providers: [VotingService]
})
export class VotingModule {}
