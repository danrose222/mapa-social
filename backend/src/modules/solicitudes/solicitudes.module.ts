import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Solicitud } from './entities/solicitud.entity';
import { Resource } from '../resources/entities/resource.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';

import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Solicitud, Resource, User, Category])],
  controllers: [SolicitudesController],
  providers: [SolicitudesService],
})
export class SolicitudesModule {}
