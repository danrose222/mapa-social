import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { SolicitudesService } from './solicitudes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthUser {
  id: number;
  role: string;
}

@ApiTags('Solicitudes')
@Controller('solicitudes')
export class MisSolicitudesController {
  constructor(private readonly service: SolicitudesService) {}

  @Get('mias')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ver mis propias solicitudes hechas como ayudante' })
  @ApiResponse({ status: 200, description: 'Listado de mis solicitudes' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.service.findMine(user);
  }
}
