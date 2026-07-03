import { IsNotEmpty, IsString } from 'class-validator';

export class VoterLoginDto {
  @IsString()
  @IsNotEmpty()
  googleToken: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}
