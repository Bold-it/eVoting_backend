import { IsString, IsNotEmpty, IsOptional, IsDateString, IsBoolean, IsEnum } from 'class-validator';
import { ElectionStatus } from '@prisma/client';

export class CreateElectionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsBoolean()
  @IsOptional()
  requirePhoto?: boolean;

  @IsEnum(ElectionStatus)
  @IsOptional()
  status?: ElectionStatus;
}
