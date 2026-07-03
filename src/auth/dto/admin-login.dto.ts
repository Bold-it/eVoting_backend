import { IsNotEmpty, IsString } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  @IsNotEmpty()
  googleToken: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}
