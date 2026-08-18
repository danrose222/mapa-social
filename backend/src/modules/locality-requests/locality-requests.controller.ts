import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { LocalityRequestsService } from './locality-requests.service';
import { CreateLocalityRequestDto } from './dto/create-locality-request.dto';
import { RespondLocalityRequestDto } from './dto/respond-locality-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthUser {
  id: number;
  role: string;
}

@ApiTags('Locality Requests')
@Controller('locality-requests')
export class LocalityRequestsController {
  constructor(private readonly service: LocalityRequestsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pedir jurisdicción sobre una localidad (solo moderador)' })
  @ApiResponse({ status: 201, description: 'Solicitud creada (o la pendiente existente)' })
  create(@Body() dto: CreateLocalityRequestDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get('mias')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mis propias solicitudes de localidad, con su estado' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.service.findMine(user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Solicitudes pendientes de revisar (solo admin)' })
  findPending() {
    return this.service.findPending();
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Aprobar o rechazar una solicitud (solo admin) -- al aprobar, asigna la localidad',
  })
  respond(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondLocalityRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.respond(id, dto, user);
  }
}
