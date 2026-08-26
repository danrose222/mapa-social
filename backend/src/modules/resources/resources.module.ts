import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { Resource } from './entities/resource.entity';
import { CollaborationRequest } from './entities/collaboration-request.entity';
import { ResourceRequest } from './entities/resource-request.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { ModeratorLocality } from '../users/entities/moderator-locality.entity';
import { OrganizationsModule } from '../organizations/organizations.module';

import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Resource,
      CollaborationRequest,
      ResourceRequest,
      User,
      Category,
      ModeratorLocality,
    ]),
    OrganizationsModule,
    // Acotado a POST /resources/:id/contact y POST /resources/:id/request
    // (ver los guards en resources.controller.ts) -- mismo patrón aislado
    // que 'login' en AuthModule, no un límite global de la API.
    ThrottlerModule.forRoot([
      {
        name: 'collaborate',
        ttl: 60_000,
        limit: 3,
      },
      {
        name: 'resourceRequest',
        ttl: 60_000,
        limit: 5,
      },
    ]),
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
