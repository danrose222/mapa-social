import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthUser {
  id: number;
  role: string;
  ciudad?: string;
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  // Alta de una comunidad/ong hecha por un moderador (tramite presencial en
  // la municipalidad, con un asistente): ya quedo validada en persona, asi
  // que nace aprobada, sin pasar por el paso de "pendientes de aprobar".
  @Post('registrar-asistida')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  createAsistida(@Body() dto: CreateUserDto) {
    return this.service.create(dto, true);
  }

  // Por defecto, solo la propia jurisdiccion (comportamiento historico, del
  // que dependen panel-municipio y organizaciones-pendientes). El mapa del
  // moderador pide ?scope=all para ver a toda la red y priorizar la propia
  // jurisdiccion en el frontend (ver mapa.component.ts), en vez de perderse
  // las comunidades/ONGs de otras ciudades.
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  findAll(@CurrentUser() user: AuthUser, @Query('scope') scope?: string) {
    return this.service.findAll(scope === 'all' ? undefined : user.ciudad);
  }

  @Get('pending-approvals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  findPendingApprovals(@CurrentUser() user: AuthUser) {
    return this.service.findPendingApprovals(user.ciudad);
  }

  // Capa pública para donantes (mapa, sin login): comunidades en estado
  // crítico. Sin guard a propósito. Devuelve ubicación aproximada y "qué
  // necesita" derivado de sus propias Necesidades activas — ver el
  // comentario en el service para el porqué de cada recorte de datos.
  @Get('comunidades-criticas-publico')
  findComunidadesCriticasPublico() {
    return this.service.findComunidadesCriticasPublico();
  }

  // Cualquier usuario logueado (comunidad u ong) necesita ver a quien le
  // puede pedir ayuda directamente. No requiere ser moderador.
  @Get('directorio-ayuda')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findDirectorioAyuda(@CurrentUser() user: AuthUser) {
    return this.service.findDirectorioAyuda(user);
  }

  // A quien se le puede derivar: una comunidad/ong deriva a cualquier otra
  // comunidad u ong aprobada (lo que importa es quien tenga el recurso
  // disponible, sin importar jurisdiccion); un moderador deriva solo a las
  // comunidades/ongs de su propia jurisdiccion, que ya aprobo el mismo.
  @Get('directorio-derivar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findDirectorioDerivar(@CurrentUser() user: AuthUser) {
    return this.service.findDirectorioDerivar(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  remove(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.service.remove(id);
  }
}
