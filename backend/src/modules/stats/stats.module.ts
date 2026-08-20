import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Need } from '../needs/entities/need.entity';
import { Resource } from '../resources/entities/resource.entity';
import { Category } from '../categories/entities/category.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([Need, Resource, Category])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
