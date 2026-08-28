import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Need } from '../needs/entities/need.entity';
import { Resource } from '../resources/entities/resource.entity';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [TypeOrmModule.forFeature([Need, Resource])],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
