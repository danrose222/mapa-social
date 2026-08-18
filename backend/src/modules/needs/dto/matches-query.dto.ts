import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class MatchesQueryDto {
  @ApiPropertyOptional({ description: 'Radio en kilómetros (default 15, máx 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  radius?: number;

  @ApiPropertyOptional({ description: 'Cantidad máxima de resultados (default 10, máx 30)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(30)
  limit?: number;
}
