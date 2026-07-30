import { Controller, Get } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { StatsService } from './stats.service';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly service: StatsService) {}

  @Get('overview')
  overview() {
    return this.service.overview();
  }
}
