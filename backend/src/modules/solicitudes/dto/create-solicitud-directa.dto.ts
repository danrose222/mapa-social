import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSolicitudDirectaDto {
  @ApiProperty({
    example: 100,
    description: 'ID del usuario moderador (municipio) u ong al que se le pide ayuda',
  })
  @IsInt()
  targetUserId!: number;

  @ApiProperty({
    example: 3,
    description: 'ID de la categoría (tipo de ayuda) que se necesita',
  })
  @IsInt()
  categoryId!: number;

  // Solo se usan cuando quien pide es un moderador derivando a un tercero
  // que se acerco en persona a la municipalidad (no tiene cuenta propia):
  // para comunidad/ong estos campos se ignoran, sus datos de contacto
  // siempre salen del perfil ya registrado.
  @ApiProperty({
    example: 'Juana Pérez',
    required: false,
    description: 'Nombre de la persona atendida en persona (solo para pedidos hechos por un moderador)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  contactName?: string;

  @ApiProperty({
    example: '351-1234567',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  contactInfo?: string;

  @ApiProperty({
    example: 'Vive en barrio Alberdi, casa con portón verde',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
