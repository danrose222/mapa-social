import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class DerivarSolicitudDto {
  @ApiProperty({
    example: 9,
    description: 'ID de la comunidad u ONG a la que se deriva la solicitud',
  })
  @IsInt()
  targetUserId!: number;
}
