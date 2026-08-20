import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DeleteImageDto {
  @ApiProperty({
    example: '/api/uploads/a1b2c3d4.jpg',
    description: 'URL devuelta por POST /uploads/image',
  })
  @IsString()
  url!: string;
}
