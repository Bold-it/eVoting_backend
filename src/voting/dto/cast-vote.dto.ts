import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CastVoteDto {
  @IsString()
  @IsNotEmpty()
  encryptedPayload: string;

  @IsString()
  @IsOptional()
  encryptedKey?: string;

  @IsString()
  @IsNotEmpty()
  iv: string;
}
