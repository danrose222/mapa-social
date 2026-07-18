import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateResourceDto {
  @ApiProperty({
    example: 'Donación de alimentos',
  })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    example: 'Dispongo de alimentos no perecederos para donar.',
  })
  @IsString()
  description!: string;

  @ApiProperty({
    example: 1,
  })
  @IsInt()
  userId!: number;

  @ApiProperty({
    example: 1,
  })
  @IsInt()
  categoryId!: number;

  @ApiProperty({
    example: -31.420083,
    description: 'Latitud del recurso',
  })
  @IsNumber()
  latitude!: number;

  @ApiProperty({
    example: -64.188776,
    description: 'Longitud del recurso',
  })
  @IsNumber()
  longitude!: number;

  @ApiProperty({
    example: 'available',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
}
