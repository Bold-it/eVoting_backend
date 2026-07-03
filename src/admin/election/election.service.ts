import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { ResultsService } from '../results/results.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';

@Injectable()
export class ElectionService {
  private readonly logger = new Logger(ElectionService.name);

  constructor(
    private prisma: PrismaService,
    private resultsService: ResultsService
  ) {}

  // ─── Automated Election Lifecycle ────────────────────────────────────────
  @Cron(CronExpression.EVERY_MINUTE)
  async handleElectionTransitions() {
    const now = new Date();

    // Auto-OPEN elections whose startTime has passed and are still in draft
    const toOpen = await this.prisma.election.findMany({
      where: { status: 'draft', startTime: { lte: now }, NOT: { startTime: null } },
      select: { id: true, title: true },
    });
    for (const election of toOpen) {
      await this.prisma.election.update({ where: { id: election.id }, data: { status: 'open' } });
      this.logger.log(`⏰ Auto-OPENED election: "${election.title}" (${election.id})`);
    }

    // Auto-CLOSE elections whose endTime has passed and are still open
    const toClose = await this.prisma.election.findMany({
      where: { status: 'open', endTime: { lte: now }, NOT: { endTime: null } },
      select: { id: true, title: true },
    });
    for (const election of toClose) {
      await this.prisma.election.update({ where: { id: election.id }, data: { status: 'closed' } });
      this.logger.log(`⏰ Auto-CLOSED election: "${election.title}" (${election.id})`);
    }
  }

  async create(createElectionDto: CreateElectionDto) {
    // Generate RSA Keypair (2048-bit)
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return this.prisma.election.create({
      data: {
        ...createElectionDto,
        publicKey,
        privateKey,
      },
    });
  }

  async findAll() {
    // DO NOT return private keys in a list!
    return this.prisma.election.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        startTime: true,
        endTime: true,
        publicKey: true,
        // privateKey intentionally omitted
        createdAt: true,
        _count: {
          select: { Voters: true, Positions: true, VoteRecords: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const election = await this.prisma.election.findUnique({
      where: { id },
      include: {
        Positions: {
          include: { Candidates: true },
        },
        _count: {
          select: { Voters: true, VoteRecords: true },
        },
      },
    });

    if (!election) {
      throw new NotFoundException(`Election with ID ${id} not found`);
    }

    return election;
  }

  async generateReport(id: string) {
    const election = await this.prisma.election.findUnique({
      where: { id },
      include: {
        Positions: {
          include: { 
            Candidates: true
          },
        },
      },
    });

    if (!election) throw new NotFoundException(`Election not found`);

    const totalVoters = await this.prisma.voter.count({ where: { electionId: id } });
    const tokensGenerated = await this.prisma.voterToken.count({ where: { voter: { electionId: id } } });
    const votesCast = await this.prisma.voteRecord.count({ where: { electionId: id } });

    // Determine if we should decrypt results (only if closed or results_published)
    const isClosed = election.status === 'closed' || election.status === 'results_published';
    
    let decryptedResults: any = null;
    if (isClosed && election.privateKey) {
      try {
        decryptedResults = await this.resultsService.getResults(id);
      } catch (err) {
        console.error('Failed to decrypt results for report', err);
      }
    }

    const positions = election.Positions.map(pos => {
      // Find decrypted position results if available
      const decPos = decryptedResults?.positions?.find((p: any) => p.title === pos.name);
      
      return {
        name: pos.name,
        candidates: pos.Candidates.map(c => {
          const decCand = decPos?.candidates?.find((cand: any) => cand.id === c.id);
          return {
            name: c.name,
            votes: decCand ? decCand.votes : null,
          };
        }),
        totalVotes: decPos ? decPos.totalVotes : 0,
      };
    });

    return {
      electionInfo: {
        title: election.title,
        status: election.status,
        startTime: election.startTime,
        endTime: election.endTime,
      },
      voterMetrics: {
        totalVoters,
        tokensGenerated,
        votesCast,
        turnoutPercentage: totalVoters > 0 ? ((votesCast / totalVoters) * 100).toFixed(2) : 0,
      },
      positions,
      decrypted: !!decryptedResults,
    };
  }

  async update(id: string, updateElectionDto: UpdateElectionDto) {
    await this.findOne(id);
    return this.prisma.election.update({
      where: { id },
      data: updateElectionDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.election.delete({
      where: { id },
    });
  }
}
