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
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { ResourcesService } from './resources.service';

import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { CreateCollaborationRequestDto } from './dto/create-collaboration-request.dto';
import { CreateResourceRequestDto } from './dto/create-resource-request.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
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
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Publicar un recurso (solo moderador o usuario de una organización avalada, con el email confirmado)',
  })
  @ApiResponse({ status: 201, description: 'Recurso creado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description:
      'No es moderador ni pertenece a una organización avalada, o el email de la cuenta todavía no fue confirmado',
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

  @Get('mias')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar mis propios recursos publicados' })
  @ApiResponse({ status: 200, description: 'Listado de mis recursos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.service.findMine(user.id);
  }

  @Get('collaboration-requests/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar los mensajes de colaboración recibidos por mi organización',
  })
  @ApiResponse({ status: 200, description: 'Listado de mensajes' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  findMyCollaborationRequests(@CurrentUser() user: AuthUser) {
    return this.service.findCollaborationRequestsForOrganization(user.id);
  }

  @Get('requests/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar las solicitudes express recibidas por mi organización sobre sus recursos',
  })
  @ApiResponse({ status: 200, description: 'Listado de solicitudes' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  findMyResourceRequests(@CurrentUser() user: AuthUser) {
    return this.service.findResourceRequestsForOrganization(user.id);
  }

  @Get('requests/sent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar las solicitudes express que YO mandé a organizaciones ("Mi Actividad")',
  })
  @ApiResponse({ status: 200, description: 'Listado de solicitudes' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  findMySentResourceRequests(@CurrentUser() user: AuthUser) {
    return this.service.findMySentResourceRequests(user.id);
  }

  @Post(':id/contact')
  @UseGuards(ThrottlerGuard)
  @Throttle({ collaborate: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Enviar un mensaje de colaboración a la organización dueña del recurso (público, sin necesidad de cuenta, rate-limited)',
  })
  @ApiResponse({ status: 201, description: 'Mensaje registrado' })
  @ApiResponse({
    status: 404,
    description: 'Recurso inexistente o sin organización asociada',
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiados intentos, esperar antes de reintentar',
  })
  contact(
    @Param('id', ParseIntPipe)
    id: number,
    @Body() dto: CreateCollaborationRequestDto,
  ) {
    return this.service.contactAboutResource(id, dto);
  }

  @Post(':id/request')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Solicitud express de un usuario logueado hacia un recurso puntual -- contacto y categoría se heredan de la cuenta y el recurso, no se piden de nuevo',
  })
  @ApiResponse({ status: 201, description: 'Solicitud registrada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'El email de la cuenta todavía no fue confirmado',
  })
  @ApiResponse({
    status: 404,
    description: 'Recurso inexistente o sin organización asociada',
  })
  requestResource(
    @Param('id', ParseIntPipe)
    id: number,
    @Body() dto: CreateResourceRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.requestResource(id, user.id, dto);
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
