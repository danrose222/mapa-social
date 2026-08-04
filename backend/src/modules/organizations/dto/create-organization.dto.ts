import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    example: 'Comedor Los Pinos',
  })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({
    example: 'Comedor comunitario que asiste a familias del barrio Alberdi.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'Tel: 351-1234567',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactInfo?: string;

  @ApiProperty({
    example: 'Av. Colón 1234, Córdoba',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
