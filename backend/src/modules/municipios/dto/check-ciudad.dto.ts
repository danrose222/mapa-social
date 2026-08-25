import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckCiudadDto {
  @ApiPropertyOptional({
    example: 'Río Segundo',
    description: 'Ciudad a verificar contra los municipios registrados',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad?: string;
}
