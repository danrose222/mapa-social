import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateModeratorRequestDto {
  @ApiProperty({
    example: 'Río Segundo',
    description: 'Localidad que solicita administrar, tal como la devuelve la API Georef',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  locality!: string;

  @ApiProperty({
    example: 'Córdoba',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  provincia?: string;

  @ApiProperty({
    example: 'Municipalidad de Río Segundo',
    description: 'Municipio u organismo que representa',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  institutionName!: string;

  @ApiProperty({
    example: 'Secretario de Desarrollo Social',
    description: 'Cargo o función que ocupa',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  position!: string;

  @ApiProperty({
    example: 'desarrollosocial@riosegundo.gob.ar',
    description: 'Email institucional de contacto -- no tiene que ser el email de la cuenta',
  })
  @IsEmail()
  officialEmail!: string;

  @ApiProperty({
    example: '351-4123456',
    description: 'Teléfono institucional de contacto',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  officialPhone!: string;

  @ApiProperty({
    example: 'Queremos poder avalar los comedores comunitarios registrados en el municipio.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  justification?: string;
}
