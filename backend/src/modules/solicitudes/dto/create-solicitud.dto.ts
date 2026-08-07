import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSolicitudDto {
  @ApiProperty({
    example: [1, 2],
    description: 'IDs de los recursos que se quieren solicitar',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  resourceIds!: number[];

  @ApiProperty({
    example: 'Carlos Gomez',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  contactName?: string;

  @ApiProperty({
    example: '011-5555-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  contactInfo?: string;

  // Si quien pide ayuda no tiene un telefono o email propio y seguro donde
  // contactarlo (por ejemplo, pidio ayuda desde el celular de otra persona),
  // la direccion permite coordinar una visita en persona. El service exige
  // que venga al menos uno de los dos: contactInfo o address.
  @ApiProperty({
    example: 'Plaza San Martín, banco frente a la fuente',
    required: false,
    description:
      'Dirección o punto de referencia para asistencia domiciliaria, si no hay un contacto propio confiable',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
