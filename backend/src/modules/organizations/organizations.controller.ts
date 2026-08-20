import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SolicitudesService } from '../solicitudes/solicitudes.service';
import { hideNeedContactUnlessAuthorized } from '../needs/needs-contact.util';
import { hideResourceContactUnlessAuthorized } from '../resources/resource-contact.util';

interface AuthUser {
  id: number;
  role: string;
}

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly service: OrganizationsService,
    private readonly solicitudesService: SolicitudesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Crear una organización (cualquier usuario logueado; queda vinculado como su dueño y sin avalar hasta que un moderador la apruebe)',
  })
  @ApiResponse({ status: 201, description: 'Organización creada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las organizaciones (público)' })
  @ApiResponse({ status: 200, description: 'Listado de organizaciones' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver el perfil público de una organización' })
  @ApiResponse({ status: 200, description: 'Organización encontrada' })
  @ApiResponse({ status: 404, description: 'Organización inexistente' })
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.service.findOne(id);
  }

  @Get(':id/resources')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Listar los recursos que ofrece una organización (público; el contacto se enmascara con el mismo criterio que /resources)',
  })
  @ApiResponse({ status: 200, description: 'Listado de recursos' })
  @ApiResponse({ status: 404, description: 'Organización inexistente' })
  async findResources(
    @Param('id', ParseIntPipe)
    id: number,
    @CurrentUser() user: AuthUser | null,
  ) {
    const resources = await this.service.findResources(id);
    return resources.map((r) => hideResourceContactUnlessAuthorized(r, user));
  }

  @Get(':id/needs')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Listar las necesidades de una organización (público; el contacto se enmascara con el mismo criterio que /needs)',
  })
  @ApiResponse({ status: 200, description: 'Listado de necesidades' })
  @ApiResponse({ status: 404, description: 'Organización inexistente' })
  async findNeeds(
    @Param('id', ParseIntPipe)
    id: number,
    @CurrentUser() user: AuthUser | null,
  ) {
    const needs = await this.service.findNeeds(id);
    const acceptedNeedIds = user
      ? await this.solicitudesService.findAcceptedNeedIds(user.id)
      : new Set<number>();
    return needs.map((n) => hideNeedContactUnlessAuthorized(n, user, acceptedNeedIds));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Editar una organización. Un moderador puede editar todo, incluido avalarla, acotado a su localidad. Un miembro de la propia organización puede editar su perfil, pero nunca el campo verified',
  })
  @ApiResponse({ status: 200, description: 'Organización actualizada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'No pertenece a la organización, intenta avalarla sin ser moderador, o es un moderador de otra localidad',
  })
  @ApiResponse({ status: 404, description: 'Organización inexistente' })
  update(
    @Param('id', ParseIntPipe)
    id: number,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Eliminar una organización (solo un moderador de su misma ciudad)',
  })
  @ApiResponse({ status: 200, description: 'Organización eliminada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'No tiene rol moderador, o es de otra ciudad',
  })
  @ApiResponse({ status: 404, description: 'Organización inexistente' })
  remove(
    @Param('id', ParseIntPipe)
    id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user);
  }
}
