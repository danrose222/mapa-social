import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
export class CreateNeedDto {
  @ApiProperty({
    example: 'Necesito ayuda con la compra de alimentos',
  })
  @IsString()
  @MaxLength(255)
  title!: string;
  @ApiProperty({
    example: 'Estoy buscando ayuda para conseguir alimentos para mi familia.',
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
    description: 'Latitud de la necesidad',
  })
  @IsNumber({
    maxDecimalPlaces: 8,
  })
  latitude!: number;
  @ApiProperty({
    example: -64.188776,
    description: 'Longitud de la necesidad',
  })
  @IsNumber({
    maxDecimalPlaces: 8,
  })
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
    example: 'active',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
}
