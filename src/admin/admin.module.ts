import { Module } from '@nestjs/common';
import { ElectionController } from './election/election.controller';
import { ElectionService } from './election/election.service';
import { PositionController } from './position/position.controller';
import { PositionService } from './position/position.service';
import { CandidateController } from './candidate/candidate.controller';
import { CandidateService } from './candidate/candidate.service';
import { VoterController } from './voter/voter.controller';
import { VoterService } from './voter/voter.service';
import { SupabaseService } from './supabase/supabase.service';
import { ResultsController } from './results/results.controller';
import { ResultsService } from './results/results.service';
import { UserModule } from './user/user.module';
import { AuditModule } from './audit/audit.module';

import { PublicResultsController } from './results/public-results.controller';

@Module({
  imports: [UserModule, AuditModule],
  controllers: [ElectionController, PositionController, CandidateController, VoterController, ResultsController, PublicResultsController],
  providers: [ElectionService, PositionService, CandidateService, VoterService, SupabaseService, ResultsService]
})
export class AdminModule {}
