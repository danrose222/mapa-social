import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCollaborationRequestDto {
  @ApiProperty({
    example: 'Ana Gómez',
  })
  @IsString()
  @MaxLength(150)
  contactName!: string;

  @ApiProperty({
    example: 'ana.gomez@example.com',
  })
  @IsEmail()
  @MaxLength(255)
  contactEmail!: string;

  @ApiProperty({
    example: 'Me gustaría colaborar donando mi tiempo los fines de semana.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @ApiProperty({
    description:
      'Campo trampa anti-spam: debe llegar siempre vacío. Un bot que completa todos los campos del formulario lo va a llenar; una persona real no lo ve (está oculto en el formulario).',
    required: false,
  })
  @IsOptional()
  @IsString()
  website?: string;
}
