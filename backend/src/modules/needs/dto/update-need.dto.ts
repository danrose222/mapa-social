import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { CreateNeedDto } from './create-need.dto';

export class UpdateNeedDto extends PartialType(CreateNeedDto) {
  @ApiProperty({
    example: true,
    description:
      'Solo un moderador puede cambiar esto. Si es true, el contacto queda oculto hasta que el dueño acepte una Solicitud -- si es false (default), cualquier persona logueada ve el contacto directamente.',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresSolicitud?: boolean;
}
