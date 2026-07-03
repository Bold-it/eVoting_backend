import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCandidateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  manifesto?: string;
}
