import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateNeedDto {
  @ApiProperty({
    example: `'Necesito ayuda con la compra de alimentos'`,
  })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    example: `'Estoy buscando a alguien que pueda ayudarme a comprar alimentos para mi familia.'`,
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
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
