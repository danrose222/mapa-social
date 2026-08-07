import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

import { CreateUserDto } from './create-user.dto';

const ESTADOS_AYUDA_VALIDOS = ['estable', 'critico'];

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    description:
      'Solo un moderador puede aprobar una organización para que pueda publicar recursos',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  approved?: boolean;

  @ApiProperty({
    description:
      'Solo tiene sentido para el rol comunidad: le avisa al municipio si necesita ayuda urgente',
    enum: ESTADOS_AYUDA_VALIDOS,
    required: false,
  })
  @IsOptional()
  @IsIn(ESTADOS_AYUDA_VALIDOS)
  estadoAyuda?: 'estable' | 'critico';
}
