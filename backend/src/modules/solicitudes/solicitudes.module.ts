import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Solicitud } from './entities/solicitud.entity';
import { Need } from '../needs/entities/need.entity';
import { ModeratorLocality } from '../users/entities/moderator-locality.entity';
import { SolicitudesController } from './solicitudes.controller';
import { MisSolicitudesController } from './mis-solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Solicitud, Need, ModeratorLocality])],
  controllers: [SolicitudesController, MisSolicitudesController],
  providers: [SolicitudesService],
  exports: [SolicitudesService],
})
export class SolicitudesModule {}
