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
import { SearchNeedsDto } from './dto/search-needs.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { NeedsService } from './needs.service';
import { Need } from './entities/need.entity';

import { CreateNeedDto } from './dto/create-need.dto';
import { UpdateNeedDto } from './dto/update-need.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthUser {
  id: number;
  role: string;
  organizationId?: number | null;
}

@ApiTags('Needs')
@Controller('needs')
export class NeedsController {
  constructor(private readonly service: NeedsService) {}

  private hideContactUnlessAuthorized(
    item: Need,
    user: AuthUser | null,
  ): Need {
    const isModerator = user?.role === 'moderador';
    const isOwner = user?.id === item.userId;
    const isSameOrganization =
      user?.organizationId != null &&
      user.organizationId === item.organizationId;

    if (isModerator || isOwner || isSameOrganization) {
      return item;
    }

    return { ...item, contactName: undefined, contactInfo: undefined };
  }

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
      'Listar todas las necesidades (público; el contacto se oculta salvo para el dueño, su organización o un moderador)',
  })
  @ApiResponse({ status: 200, description: 'Listado de necesidades' })
  async findAll(@CurrentUser() user: AuthUser | null) {
    const needs = await this.service.findAll();
    return needs.map((n) => this.hideContactUnlessAuthorized(n, user));
  }

  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar necesidades activas con filtros (público)' })
  @ApiResponse({ status: 200, description: 'Resultados de la búsqueda' })
  async search(
    @Query() dto: SearchNeedsDto,
    @CurrentUser() user: AuthUser | null,
  ) {
    const needs = await this.service.search(dto);
    return needs.map((n) => this.hideContactUnlessAuthorized(n, user));
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
    return need ? this.hideContactUnlessAuthorized(need, user) : need;
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
