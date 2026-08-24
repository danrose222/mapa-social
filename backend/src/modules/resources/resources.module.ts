import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { Resource } from './entities/resource.entity';
import { CollaborationRequest } from './entities/collaboration-request.entity';
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
      User,
      Category,
      ModeratorLocality,
    ]),
    OrganizationsModule,
    // Acotado a POST /resources/:id/contact (ver el guard en
    // resources.controller.ts) -- mismo patrón aislado que 'login' en
    // AuthModule, no un límite global de la API.
    ThrottlerModule.forRoot([
      {
        name: 'collaborate',
        ttl: 60_000,
        limit: 3,
      },
    ]),
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
