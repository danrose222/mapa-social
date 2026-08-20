import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SearchNeedsDto } from './dto/search-needs.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { NeedsService } from './needs.service';
import { SolicitudesService } from '../solicitudes/solicitudes.service';
import { ResourcesService } from '../resources/resources.service';
import { hideNeedContactUnlessAuthorized } from './needs-contact.util';
import { hideResourceContactUnlessAuthorized } from '../resources/resource-contact.util';

import { CreateNeedDto } from './dto/create-need.dto';
import { UpdateNeedDto } from './dto/update-need.dto';
import { MatchesQueryDto } from './dto/matches-query.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthUser {
  id: number;
  role: string;
}

@ApiTags('Needs')
@Controller('needs')
export class NeedsController {
  constructor(
    private readonly service: NeedsService,
    private readonly solicitudesService: SolicitudesService,
    private readonly resourcesService: ResourcesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publicar una necesidad (requiere estar logueado)' })
  @ApiResponse({ status: 201, description: 'Necesidad creada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Categoría inexistente' })
  create(@Body() dto: CreateNeedDto, @CurrentUser() user: AuthUser) {
    return this.service.create(user.id, dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Listar todas las necesidades (público; el contacto es visible si la publicación pertenece a una organización, o para el dueño/moderador)',
  })
  @ApiResponse({ status: 200, description: 'Listado de necesidades' })
  async findAll(@CurrentUser() user: AuthUser | null) {
    const needs = await this.service.findAll();
    const acceptedNeedIds = user
      ? await this.solicitudesService.findAcceptedNeedIds(user.id)
      : new Set<number>();
    return needs.map((n) => hideNeedContactUnlessAuthorized(n, user, acceptedNeedIds));
  }

  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar necesidades activas con filtros, paginado (público)' })
  @ApiResponse({ status: 200, description: 'Resultados de la búsqueda, paginados' })
  async search(
    @Query() dto: SearchNeedsDto,
    @CurrentUser() user: AuthUser | null,
  ) {
    const { items, total, page, limit, totalPages } = await this.service.search(dto);
    const acceptedNeedIds = user
      ? await this.solicitudesService.findAcceptedNeedIds(user.id)
      : new Set<number>();

    return {
      items: items.map((n) => hideNeedContactUnlessAuthorized(n, user, acceptedNeedIds)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  @Get('localities')
  @ApiOperation({
    summary: 'Localidades con al menos una necesidad activa, con cuántas hay en cada una',
  })
  @ApiResponse({ status: 200, description: 'Listado de localidades' })
  localities() {
    return this.service.localities();
  }

  @Get(':id/matches')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Matching: recursos disponibles de la misma categoría que esta necesidad, dentro de un radio (default 15km)',
  })
  @ApiResponse({ status: 200, description: 'Recursos sugeridos, ordenados por cercanía' })
  @ApiResponse({ status: 404, description: 'Necesidad inexistente' })
  async matches(
    @Param('id', ParseIntPipe) id: number,
    @Query() dto: MatchesQueryDto,
    @CurrentUser() user: AuthUser | null,
  ) {
    const need = await this.service.findOne(id);

    if (!need) {
      throw new NotFoundException('Necesidad inexistente');
    }

    const resources = await this.resourcesService.findNearbyByCategory(
      need.latitude,
      need.longitude,
      need.categoryId,
      dto.radius ?? 15,
      dto.limit ?? 10,
    );

    return resources.map((r) => hideResourceContactUnlessAuthorized(r, user));
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ver el detalle de una necesidad (público)' })
  @ApiResponse({ status: 200, description: 'Necesidad encontrada' })
  async findOne(
    @Param('id', ParseIntPipe)
    id: number,
    @CurrentUser() user: AuthUser | null,
  ) {
    const need = await this.service.findOne(id);

    if (!need) {
      return need;
    }

    const acceptedNeedIds = user
      ? await this.solicitudesService.findAcceptedNeedIds(user.id)
      : new Set<number>();

    return hideNeedContactUnlessAuthorized(need, user, acceptedNeedIds);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Editar una necesidad (el dueño o un moderador; solo un moderador puede cambiar el status)',
  })
  @ApiResponse({ status: 200, description: 'Necesidad actualizada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'No es el dueño, ni moderador, o intenta cambiar el status sin serlo',
  })
  @ApiResponse({ status: 404, description: 'Necesidad inexistente' })
  update(
    @Param('id', ParseIntPipe)
    id: number,
    @Body() dto: UpdateNeedDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar una necesidad (el dueño o un moderador)' })
  @ApiResponse({ status: 200, description: 'Necesidad eliminada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No es el dueño ni moderador' })
  @ApiResponse({ status: 404, description: 'Necesidad inexistente' })
  remove(
    @Param('id', ParseIntPipe)
    id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user);
  }
}
