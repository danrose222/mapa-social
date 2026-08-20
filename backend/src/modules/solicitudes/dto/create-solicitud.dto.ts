import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSolicitudDto {
  @ApiProperty({
    example: 'Puedo acercarte alimentos este sábado por la tarde.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
