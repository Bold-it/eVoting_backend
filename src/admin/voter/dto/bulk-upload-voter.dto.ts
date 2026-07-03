import { IsString, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVoterDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class BulkUploadVoterDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVoterDto)
  voters: CreateVoterDto[];
}
