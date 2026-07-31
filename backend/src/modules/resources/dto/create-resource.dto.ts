import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateResourceDto {
  @ApiProperty({
    example: 'Donación de alimentos',
  })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    example: 'Dispongo de alimentos no perecederos para donar.',
  })
  @IsString()
  description!: string;

  @ApiProperty({
    example: 1,
  })
  @IsInt()
  categoryId!: number;

  @ApiProperty({
    example: -31.420083,
    description: 'Latitud del recurso',
  })
  @IsNumber()
  latitude!: number;

  @ApiProperty({
    example: -64.188776,
    description: 'Longitud del recurso',
  })
  @IsNumber()
  longitude!: number;

  @ApiProperty({
    example: 'Barrio Alberdi, cerca de la plaza',
    description:
      'Referencia legible de la ubicación (opcional, no reemplaza a latitude/longitude)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiProperty({
    example: 'Comedor Los Pinos',
    description: 'Organización responsable del recurso, si corresponde',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  organizationName?: string;

  @ApiProperty({
    example: 'Lunes a viernes de 9 a 17',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  schedule?: string;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre de contacto (opcional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  contactName?: string;

  @ApiProperty({
    example: 'Tel: 351-1234567',
    description: 'Teléfono, email o forma de contacto (opcional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactInfo?: string;

  @ApiProperty({
    example: 'available',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
}
