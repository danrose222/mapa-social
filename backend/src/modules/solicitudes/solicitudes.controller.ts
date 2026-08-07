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

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { SolicitudesService } from './solicitudes.service';

import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { CreateSolicitudDirectaDto } from './dto/create-solicitud-directa.dto';
import { DerivarSolicitudDto } from './dto/derivar-solicitud.dto';
import { UpdateSolicitudDto } from './dto/update-solicitud.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthUser {
  id: number;
  role: string;
}

@ApiTags('Solicitudes')
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly service: SolicitudesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@Body() dto: CreateSolicitudDto, @CurrentUser() user: AuthUser) {
    return this.service.create(user.id, dto);
  }

  @Post('directa')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  createDirecta(
    @Body() dto: CreateSolicitudDirectaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createDirecta(user.id, dto);
  }

  @Get('mias')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findMine(@CurrentUser() user: AuthUser) {
    return this.service.findMine(user.id);
  }

  @Get('recibidas')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findReceived(@CurrentUser() user: AuthUser) {
    return this.service.findReceived(user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @Param('id', ParseIntPipe)
    id: number,
    @Body() dto: UpdateSolicitudDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Post(':id/derivar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  derivar(
    @Param('id', ParseIntPipe)
    id: number,
    @Body() dto: DerivarSolicitudDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.derivar(id, dto, user);
  }
}
