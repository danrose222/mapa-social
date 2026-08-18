import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { StatsService } from './stats.service';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly service: StatsService) {}

  @Get('by-category')
  @ApiOperation({ summary: 'Necesidades y recursos publicados, por categoría' })
  @ApiResponse({ status: 200, description: 'Conteo por categoría' })
  byCategory() {
    return this.service.byCategory();
  }

  @Get('by-locality')
  @ApiOperation({ summary: 'Necesidades publicadas, por localidad' })
  @ApiResponse({ status: 200, description: 'Conteo por localidad' })
  byLocality() {
    return this.service.byLocality();
  }

  @Get('resolution-rate')
  @ApiOperation({ summary: '% de necesidades y recursos resueltos vs. pendientes' })
  @ApiResponse({ status: 200, description: 'Porcentajes de resolución' })
  resolutionRate() {
    return this.service.resolutionRate();
  }
}
