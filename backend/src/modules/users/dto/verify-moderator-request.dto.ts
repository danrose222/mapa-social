import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyModeratorRequestDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-...',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
