import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthUser {
  id: number;
  role: string;
}

// Los 3 endpoints son exclusivos de moderador y acotados a sus propias
// localidades -- antes eran públicos y devolvían datos de todo el sitio.
@ApiTags('Stats')
@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('moderador')
@ApiBearerAuth()
export class StatsController {
  constructor(private readonly service: StatsService) {}

  @Get('by-category')
  @ApiOperation({
    summary:
      'Necesidades y recursos por categoría, acotado a las localidades del moderador',
  })
  @ApiResponse({ status: 200, description: 'Conteo por categoría' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene rol moderador' })
  byCategory(@CurrentUser() user: AuthUser) {
    return this.service.byCategory(user);
  }

  @Get('by-locality')
  @ApiOperation({
    summary: 'Necesidades por localidad, solo entre las localidades del moderador',
  })
  @ApiResponse({ status: 200, description: 'Conteo por localidad' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene rol moderador' })
  byLocality(@CurrentUser() user: AuthUser) {
    return this.service.byLocality(user);
  }

  @Get('resolution-rate')
  @ApiOperation({
    summary:
      '% de necesidades y recursos resueltos vs. pendientes, acotado a las localidades del moderador',
  })
  @ApiResponse({ status: 200, description: 'Porcentajes de resolución' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene rol moderador' })
  resolutionRate(@CurrentUser() user: AuthUser) {
    return this.service.resolutionRate(user);
  }
}
