import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    example: 2,
    description: 'Cambiar el rol. Solo un moderador puede cambiar este campo.',
    required: false,
  })
  @IsOptional()
  @IsInt()
  roleId?: number;

  @ApiProperty({
    example: 1,
    description:
      'Vincular con una organización. Solo un moderador puede cambiar este campo.',
    required: false,
  })
  @IsOptional()
  @IsInt()
  organizationId?: number;

  @ApiProperty({
    example: 'Córdoba',
    description:
      'Ciudad que puede administrar (solo relevante para moderadores). Solo otro moderador puede cambiar este campo.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad?: string;
}
