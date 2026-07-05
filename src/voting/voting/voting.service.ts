import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CastVoteDto } from '../dto/cast-vote.dto';
import * as crypto from 'crypto';
import { AuditService } from '../../admin/audit/audit.service';

@Injectable()
export class VotingService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getBallot(electionId: string) {
    let election = await this.prisma.election.findUnique({
      where: { id: electionId },
    });

    if (!election) throw new BadRequestException('Election not found');

    const now = new Date();
    let statusChanged = false;
    let newStatus = election.status;

    if (election.status === 'draft' && election.startTime && now >= election.startTime && (!election.endTime || now < election.endTime)) {
      newStatus = 'open';
      statusChanged = true;
    } else if (election.status === 'open' && election.endTime && now >= election.endTime) {
      newStatus = 'closed';
      statusChanged = true;
    }

    if (statusChanged) {
      election = await this.prisma.election.update({
        where: { id: electionId },
        data: { status: newStatus },
      });
    }

    if (election.status !== 'open') throw new BadRequestException('Election is not currently open');

    return this.prisma.election.findUnique({
      where: { id: electionId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        startTime: true,
        endTime: true,
        publicKey: true,
        Positions: {
          include: {
            Candidates: {
              select: {
                id: true,
                name: true,
                photoUrl: true,
                manifesto: true,
              },
            },
          },
        },
      },
    });
  }

  async castVote(voterId: string, electionId: string, castVoteDto: CastVoteDto) {
    // 1. Transaction to prevent race conditions
    const result = await this.prisma.$transaction(async (tx) => {
      // 2. Lock the voter record
      const voter = await tx.voter.findUnique({
        where: { id: voterId },
      });

      if (!voter) throw new BadRequestException('Voter not found');
      if (voter.hasVoted) throw new BadRequestException('Voter has already cast their ballot');

      let election = await tx.election.findUnique({
        where: { id: electionId },
      });

      if (!election) throw new BadRequestException('Election not found');

      const now = new Date();
      let statusChanged = false;
      let newStatus = election.status;

      if (election.status === 'draft' && election.startTime && now >= election.startTime && (!election.endTime || now < election.endTime)) {
        newStatus = 'open';
        statusChanged = true;
      } else if (election.status === 'open' && election.endTime && now >= election.endTime) {
        newStatus = 'closed';
        statusChanged = true;
      }

      if (statusChanged) {
        election = await tx.election.update({
          where: { id: electionId },
          data: { status: newStatus },
        });
      }

      if (election.status !== 'open') {
        throw new BadRequestException('Election is not open for voting');
      }

      // 3. Mark voter as voted
      await tx.voter.update({
        where: { id: voterId },
        data: { hasVoted: true },
      });

      // 4. Generate hash for integrity (using SHA-256 over the encrypted payload)
      const hash = crypto
        .createHash('sha256')
        .update(castVoteDto.encryptedPayload + castVoteDto.iv)
        .digest('hex');

      // 5. Create absolute anonymous VoteRecord
      await tx.voteRecord.create({
        data: {
          electionId,
          encryptedPayload: castVoteDto.encryptedPayload,
          encryptedKey: castVoteDto.encryptedKey,
          iv: castVoteDto.iv,
          hash,
        },
      });

      return { message: 'Vote successfully cast!', voterEmail: voter.email };
    });

    // 6. Audit log (fire-and-forget, after successful commit)
    this.auditService.logAction(
      result.voterEmail,
      'VOTE_CAST',
      'VOTE',
      electionId,
      { voterId },
    ).catch(() => {});

    return { message: result.message };
  }
}
