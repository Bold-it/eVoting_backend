import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionService {
  constructor(private prisma: PrismaService) {}

  async create(electionId: string, createPositionDto: CreatePositionDto) {
    const election = await this.prisma.election.findUnique({ where: { id: electionId } });
    if (!election) throw new NotFoundException('Election not found');

    return this.prisma.position.create({
      data: {
        ...createPositionDto,
        electionId,
      },
    });
  }

  async findAllByElection(electionId: string) {
    return this.prisma.position.findMany({
      where: { electionId },
      orderBy: { createdAt: 'asc' }, // Schema has no order field
      include: {
        Candidates: true,
      },
    });
  }

  async findOne(id: string) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: { Candidates: true },
    });
    if (!position) throw new NotFoundException('Position not found');
    return position;
  }

  async update(id: string, updatePositionDto: UpdatePositionDto) {
    await this.findOne(id);
    return this.prisma.position.update({
      where: { id },
      data: updatePositionDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.position.delete({
      where: { id },
    });
  }
}
