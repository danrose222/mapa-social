import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { SolicitudesService } from './solicitudes.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { UpdateSolicitudDto } from './dto/update-solicitud.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthUser {
  id: number;
  role: string;
}

@ApiTags('Solicitudes')
@Controller('needs')
export class SolicitudesController {
  constructor(private readonly service: SolicitudesService) {}

  @Post(':id/solicitudes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Ofrecerse a ayudar con una necesidad (no podés ofrecerte a la tuya propia)',
  })
  @ApiResponse({ status: 201, description: 'Solicitud creada (o la pendiente existente)' })
  @ApiResponse({ status: 400, description: 'La necesidad ya no está activa' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Es tu propia necesidad' })
  @ApiResponse({ status: 404, description: 'Necesidad inexistente' })
  create(
    @Param('id', ParseIntPipe) needId: number,
    @Body() dto: CreateSolicitudDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(needId, dto, user);
  }

  @Get(':id/solicitudes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Ver quién se ofreció a ayudar (solo el dueño de la necesidad o un moderador)',
  })
  @ApiResponse({ status: 200, description: 'Listado de solicitudes' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No sos el dueño ni moderador' })
  @ApiResponse({ status: 404, description: 'Necesidad inexistente' })
  findForNeed(
    @Param('id', ParseIntPipe) needId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findForNeed(needId, user);
  }

  @Patch(':id/solicitudes/:solicitudId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Aceptar o rechazar una solicitud (solo el dueño de la necesidad o un moderador). Aceptarla habilita ver el contacto del ayudante.',
  })
  @ApiResponse({ status: 200, description: 'Solicitud actualizada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No sos el dueño ni moderador' })
  @ApiResponse({ status: 404, description: 'Solicitud inexistente' })
  updateStatus(
    @Param('id', ParseIntPipe) needId: number,
    @Param('solicitudId', ParseIntPipe) solicitudId: number,
    @Body() dto: UpdateSolicitudDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateStatus(needId, solicitudId, dto, user);
  }
}
