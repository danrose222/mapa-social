import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddModeratorLocalityDto {
  @ApiProperty({
    example: 'Río Segundo',
    description: 'Nombre de la localidad, tal como lo devuelve la API Georef',
  })
  @IsString()
  @MaxLength(150)
  locality!: string;

  @ApiProperty({
    example: 'Córdoba',
    description: 'Provincia a la que pertenece (opcional, informativo)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  provincia?: string;
}
