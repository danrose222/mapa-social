import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMunicipioDto {
  @ApiProperty({
    example: 'Municipalidad de Río Segundo',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre!: string;

  @ApiProperty({
    example: 'Río Segundo',
    description:
      'Ciudad/partido que gobierna -- se compara contra Organization.ciudad para resolver qué Comunidades y ONGs caen bajo su jurisdicción',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ciudad!: string;

  @ApiProperty({
    example: '(3572) 400-000',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactInfo?: string;
}
