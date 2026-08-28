import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateSolicitudDto {
  @ApiProperty({
    example: 'accepted',
    enum: ['accepted', 'rejected'],
  })
  @IsIn(['accepted', 'rejected'])
  status!: 'accepted' | 'rejected';
}
