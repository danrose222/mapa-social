import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateResourceRequestDto {
  @ApiProperty({
    example: 'Talla L, para 2 personas, lo necesito hoy si es posible.',
    description: 'Único dato que pide el usuario -- el resto se hereda de su cuenta y del recurso.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  detailText?: string;
}
