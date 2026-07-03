import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BulkUploadVoterDto } from './dto/bulk-upload-voter.dto';
import { MailService } from '../../mail/mail.service';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class VoterService {
  private readonly logger = new Logger(VoterService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async bulkUpload(electionId: string, bulkUploadDto: BulkUploadVoterDto) {
    const election = await this.prisma.election.findUnique({ where: { id: electionId } });
    if (!election) throw new NotFoundException('Election not found');

    const result = await this.prisma.voter.createMany({
      data: bulkUploadDto.voters.map((voter) => ({
        ...voter,
        electionId,
      })),
      skipDuplicates: true,
    });

    return {
      message: `Successfully registered ${result.count} voters.`,
      count: result.count,
    };
  }

  async findAllByElection(electionId: string) {
    return this.prisma.voter.findMany({
      where: { electionId },
      include: { VoterToken: true },
      orderBy: { studentId: 'asc' },
    });
  }

  async remove(id: string) {
    return this.prisma.voter.delete({
      where: { id },
    });
  }

  async clearAllByElection(electionId: string) {
    // Because of foreign keys (VoterToken), Prisma will delete tokens automatically
    // if onDelete: Cascade is configured, or we can just delete voters and let Prisma handle it.
    // The Prisma schema has `voterId String @unique` on VoterToken with `onDelete: Cascade`.
    const result = await this.prisma.voter.deleteMany({
      where: { electionId },
    });

    this.logger.log(`Cleared ${result.count} voters for election ${electionId}`);

    return {
      message: `Successfully cleared ${result.count} voters.`,
      count: result.count,
    };
  }

  async generateTokens(electionId: string) {
    const election = await this.prisma.election.findUnique({ where: { id: electionId } });
    if (!election) throw new NotFoundException('Election not found');

    // Find all voters who do NOT have a token yet
    const votersWithoutTokens = await this.prisma.voter.findMany({
      where: { 
        electionId,
        VoterToken: null 
      },
    });

    if (votersWithoutTokens.length === 0) {
      return { message: 'All voters already have tokens.', count: 0 };
    }

    let generatedCount = 0;

    for (const voter of votersWithoutTokens) {
      // Generate a secure random token format: VOTE-XXXX-XXXX
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const rawToken = `VOTE-${part1}-${part2}`;

      // Hash the token for storage
      const tokenHash = await argon2.hash(rawToken);

      // Create the token in DB
      await this.prisma.voterToken.create({
        data: {
          voterId: voter.id,
          tokenHash,
        },
      });

      // Send the token via email asynchronously (in the background) for massive speed boost!
      this.mailService.sendTokenEmail(voter.email, voter.name, rawToken).catch(err => {
        this.logger.error(`Background email failed for ${voter.email}`, err);
      });

      generatedCount++;
    }

    this.logger.log(`Generated and emailed ${generatedCount} tokens for election ${electionId}`);

    return {
      message: `Successfully generated and emailed ${generatedCount} tokens.`,
      count: generatedCount,
    };
  }
}
