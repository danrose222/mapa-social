import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { CreateNeedDto } from './create-need.dto';

export class UpdateNeedDto extends PartialType(CreateNeedDto) {
  @ApiProperty({
    example: true,
    description:
      'Lo decide el dueño de la publicación. Si es true, el contacto queda oculto hasta que acepte una Solicitud -- si es false (default), cualquier persona logueada ve el contacto directamente.',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresSolicitud?: boolean;
}
