import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

@Injectable()
export class CandidateService {
  constructor(private prisma: PrismaService) {}

  async create(positionId: string, createCandidateDto: CreateCandidateDto, photoUrl?: string) {
    const position = await this.prisma.position.findUnique({ where: { id: positionId } });
    if (!position) throw new NotFoundException('Position not found');

    return this.prisma.candidate.create({
      data: {
        ...createCandidateDto,
        photoUrl,
        positionId,
      },
    });
  }

  async findOne(id: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }

  async update(id: string, updateCandidateDto: UpdateCandidateDto, photoUrl?: string) {
    await this.findOne(id);
    const updateData: any = { ...updateCandidateDto };
    if (photoUrl) {
      updateData.photoUrl = photoUrl;
    }

    return this.prisma.candidate.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.candidate.delete({
      where: { id },
    });
  }
}
