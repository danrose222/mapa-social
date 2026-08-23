import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { ModeratorLocality } from '../users/entities/moderator-locality.entity';
import { Need } from '../needs/entities/need.entity';
import { Resource } from '../resources/entities/resource.entity';
import { SolicitudesModule } from '../solicitudes/solicitudes.module';
import { MunicipiosModule } from '../municipios/municipios.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { TerritorialScaleInterceptor } from './interceptors/territorial-scale.interceptor';
@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, User, ModeratorLocality, Need, Resource]),
    SolicitudesModule,
    MunicipiosModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, TerritorialScaleInterceptor],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
