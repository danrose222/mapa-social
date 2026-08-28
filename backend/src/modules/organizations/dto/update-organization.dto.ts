import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';

import { CreateOrganizationDto } from './create-organization.dto';

export class UpdateOrganizationDto extends PartialType(
  CreateOrganizationDto,
) {
  @ApiProperty({
    example: true,
    description: 'Solo un moderador puede marcar una organización como avalada',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
