import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class RespondLocalityRequestDto {
  @ApiProperty({ example: 'approved', enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';
}
