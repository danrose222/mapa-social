import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Need } from './entities/need.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';

import { NeedsController } from './needs.controller';
import { NeedsService } from './needs.service';
import { SearchService } from './search/search.service';
import { SolicitudesModule } from '../solicitudes/solicitudes.module';
import { ResourcesModule } from '../resources/resources.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Need, User, Category]),
    SolicitudesModule,
    ResourcesModule,
  ],
  controllers: [NeedsController],
  providers: [NeedsService, SearchService],
})
export class NeedsModule {}
