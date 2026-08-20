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

import { ResourcesService } from './resources.service';

import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { hideResourceContactUnlessAuthorized } from './resource-contact.util';

interface AuthUser {
  id: number;
  role: string;
}

@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly service: ResourcesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Publicar un recurso (solo moderador o usuario de una organización avalada)',
  })
  @ApiResponse({ status: 201, description: 'Recurso creado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'No es moderador ni pertenece a una organización avalada',
  })
  @ApiResponse({ status: 404, description: 'Categoría inexistente' })
  create(@Body() dto: CreateResourceDto, @CurrentUser() user: AuthUser) {
    return this.service.create(user, dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Listar todos los recursos (público; el contacto es visible si el recurso pertenece a una organización, o para el dueño/moderador)',
  })
  @ApiResponse({ status: 200, description: 'Listado de recursos' })
  async findAll(@CurrentUser() user: AuthUser | null) {
    const resources = await this.service.findAll();
    return resources.map((r) => hideResourceContactUnlessAuthorized(r, user));
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ver el detalle de un recurso (público)' })
  @ApiResponse({ status: 200, description: 'Recurso encontrado' })
  async findOne(
    @Param('id', ParseIntPipe)
    id: number,
    @CurrentUser() user: AuthUser | null,
  ) {
    const resource = await this.service.findOne(id);
    return resource
      ? hideResourceContactUnlessAuthorized(resource, user)
      : resource;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Editar un recurso (el dueño o un moderador; solo un moderador puede cambiar el status)',
  })
  @ApiResponse({ status: 200, description: 'Recurso actualizado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'No es el dueño, ni moderador, o intenta cambiar el status sin serlo',
  })
  @ApiResponse({ status: 404, description: 'Recurso inexistente' })
  update(
    @Param('id', ParseIntPipe)
    id: number,
    @Body() dto: UpdateResourceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un recurso (el dueño o un moderador)' })
  @ApiResponse({ status: 200, description: 'Recurso eliminado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No es el dueño ni moderador' })
  @ApiResponse({ status: 404, description: 'Recurso inexistente' })
  remove(
    @Param('id', ParseIntPipe)
    id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user);
  }
}
