import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export const URGENCY_LEVELS = ['baja', 'media', 'alta'] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

// Formulario rápido de necesidad privada: a propósito son menos campos
// obligatorios que CreateNeedDto (sin título -- se genera solo a partir de
// la categoría -- ni dirección legible, solo el punto).
export class CreatePrivateNeedDto {
  @ApiProperty({
    example: 3,
    description: 'Categoría ya elegida en la búsqueda que no encontró resultados',
  })
  @IsInt()
  categoryId!: number;

  @ApiProperty({
    example: 'Necesito medicación para mi mamá, no puede salir de casa.',
  })
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ example: 'alta', enum: URGENCY_LEVELS })
  @IsIn(URGENCY_LEVELS)
  urgency!: UrgencyLevel;

  @ApiProperty({ example: 'Tel: 351-1234567' })
  @IsString()
  @MaxLength(255)
  contactInfo!: string;

  @ApiProperty({ example: -31.420083 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: -64.188776 })
  @IsNumber()
  longitude!: number;

  @ApiProperty({
    example: 'Alberdi',
    description: 'Localidad/jurisdicción detectada o elegida -- sin esto, solo un moderador podrá verla',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  locality?: string;
}
