// ✅ CORRECTO
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'Hipolito',
  })
  @IsString()
  firstName!: string;

  @ApiProperty({
    example: 'Paradela',
  })
  @IsString()
  lastName!: string;

  @ApiProperty({
    example: 'hparadela@live.com.ar',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'password123',
  })
  @MinLength(6)
  password!: string;

  @ApiProperty({
    example: '+5491112345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 1,
  })
  @IsInt()
  roleId!: number;
}
