import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ResultsService {
  private readonly logger = new Logger(ResultsService.name);

  constructor(private prisma: PrismaService) {}

  async getResults(electionId: string) {
    // 1. Fetch Election & Private Key
    const election = await this.prisma.election.findUnique({
      where: { id: electionId },
      include: {
        Positions: {
          include: {
            Candidates: true,
          },
        },
      },
    });

    if (!election) throw new NotFoundException('Election not found');
    if (!election.privateKey) throw new BadRequestException('Election is missing a private key for decryption.');

    // 2. Setup Results Structure
    const results: Record<string, any> = {};
    for (const position of election.Positions) {
      const isSingle = position.Candidates.length === 1;
      results[position.id] = {
        id: position.id,
        title: position.name,
        isSingleCandidate: isSingle,
        candidates: position.Candidates.map(c => ({
          id: c.id,
          name: c.name,
          photoUrl: c.photoUrl,
          votes: 0,
          yesVotes: isSingle ? 0 : undefined,
          noVotes: isSingle ? 0 : undefined,
        })),
      };
    }

    // 3. Fetch all completely anonymous Vote Records
    const voteRecords = await this.prisma.voteRecord.findMany({
      where: { electionId },
    });

    let decryptedCount = 0;
    let failedCount = 0;

    // 4. Decrypt & Tally loop
    for (const record of voteRecords) {
      try {
        if (!record.encryptedKey) {
          throw new Error('Missing encryptedKey in VoteRecord');
        }

        // a) Decrypt AES key using the Election's RSA Private Key
        const aesKeyBuffer = crypto.privateDecrypt(
          {
            key: election.privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, // Best practice, requires frontend to use same padding
          },
          Buffer.from(record.encryptedKey, 'base64')
        );

        // b) Decrypt Payload using AES-256-CBC
        const decipher = crypto.createDecipheriv(
          'aes-256-cbc',
          aesKeyBuffer,
          Buffer.from(record.iv, 'base64')
        );

        let decryptedPayload = decipher.update(record.encryptedPayload, 'base64', 'utf8');
        decryptedPayload += decipher.final('utf8');

        // c) Parse and Tally
        const selections = JSON.parse(decryptedPayload); // Format: { "positionId": "candidateId" }

        for (const [positionId, selection] of Object.entries(selections)) {
          if (results[positionId]) {
            const isSingle = results[positionId].isSingleCandidate;
            if (isSingle) {
              const candidate = results[positionId].candidates[0];
              if (candidate) {
                if (selection === candidate.id) {
                  candidate.votes += 1;
                  candidate.yesVotes += 1;
                } else if (typeof selection === 'string' && selection.startsWith('NO_')) {
                  candidate.noVotes += 1;
                }
              }
            } else {
              const candidate = results[positionId].candidates.find((c: any) => c.id === selection);
              if (candidate) {
                candidate.votes += 1;
              }
            }
          }
        }
        decryptedCount++;
      } catch (error: any) {
        this.logger.error(`Failed to decrypt VoteRecord ${record.id}: ${error.message}`);
        failedCount++;
      }
    }

    // 5. Calculate totals and sort by highest votes
    const finalPositions = Object.values(results).map((pos: any) => {
      pos.candidates.sort((a: any, b: any) => b.votes - a.votes);
      let totalVotes = 0;
      if (pos.isSingleCandidate && pos.candidates.length === 1) {
        const c = pos.candidates[0];
        totalVotes = (c.yesVotes || 0) + (c.noVotes || 0);
      } else {
        totalVotes = pos.candidates.reduce((sum: number, c: any) => sum + c.votes, 0);
      }
      return {
        ...pos,
        totalVotes,
      };
    });

    return {
      electionId: election.id,
      title: election.title,
      status: election.status,
      totalBallotsCast: voteRecords.length,
      successfullyDecrypted: decryptedCount,
      failedDecryption: failedCount,
      positions: finalPositions,
    };
  }
}
