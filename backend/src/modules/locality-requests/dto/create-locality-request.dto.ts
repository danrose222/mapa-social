import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLocalityRequestDto {
  @ApiProperty({ example: 'Alta Gracia' })
  @IsString()
  @MaxLength(150)
  locality!: string;

  @ApiProperty({ example: 'Córdoba', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  provincia?: string;
}
