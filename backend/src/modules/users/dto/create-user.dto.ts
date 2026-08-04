import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'Juan',
  })
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({
    example: 'Pérez',
  })
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({
    example: 'juan.perez@ejemplo.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'password123',
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    example: '+5493511234567',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
