import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const ESTADOS_VALIDOS = ['pendiente', 'aprobada', 'atendida', 'rechazada'];

export class UpdateSolicitudDto {
  @ApiProperty({
    example: 'atendida',
    enum: ESTADOS_VALIDOS,
  })
  @IsIn(ESTADOS_VALIDOS)
  status!: string;
}
