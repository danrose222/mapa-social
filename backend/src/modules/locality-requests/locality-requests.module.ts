import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LocalityRequest } from './entities/locality-request.entity';
import { ModeratorLocality } from '../users/entities/moderator-locality.entity';
import { LocalityRequestsController } from './locality-requests.controller';
import { LocalityRequestsService } from './locality-requests.service';

@Module({
  imports: [TypeOrmModule.forFeature([LocalityRequest, ModeratorLocality])],
  controllers: [LocalityRequestsController],
  providers: [LocalityRequestsService],
})
export class LocalityRequestsModule {}
