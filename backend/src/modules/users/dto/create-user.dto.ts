// ✅ CORRECTO
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNumber,
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
    example: 'Av. Colón 1234, Córdoba',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 'femenino',
    required: false,
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({
    example: 'Comedor Los Pinos',
    required: false,
    description: 'Solo aplica a comunidad/ong',
  })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiProperty({
    example: 'La Falda',
    required: false,
    description:
      'Jurisdicción: para moderador es el municipio que administra, para comunidad/ong es a qué municipio pertenece',
  })
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiProperty({
    example: 'Lunes a viernes de 9 a 18',
    required: false,
    description: 'Solo aplica a comunidad/ong',
  })
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiProperty({
    example: -31.4201,
    required: false,
    description: 'Solo aplica a comunidad/ong',
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({
    example: -64.1888,
    required: false,
    description: 'Solo aplica a comunidad/ong',
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({
    example: [1, 3],
    required: false,
    description: 'IDs de categorías que ofrece. Solo aplica a comunidad/ong',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  offeredCategoryIds?: number[];

  @ApiProperty({
    example: 1,
  })
  @IsInt()
  roleId!: number;
}
