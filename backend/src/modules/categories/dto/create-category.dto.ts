import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: `'Alimentoss.'`,
  })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: `'Categoría de alimentos para personas necesitadas.'`,
    required: false,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
