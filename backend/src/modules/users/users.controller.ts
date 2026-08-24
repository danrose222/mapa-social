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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AddModeratorLocalityDto } from './dto/add-moderator-locality.dto';
import { CreateModeratorRequestDto } from './dto/create-moderator-request.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
interface AuthUser {
  id: number;
  role: string;
}
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Post()
  @ApiOperation({ summary: 'Registrar un usuario nuevo (público, sin login)' })
  @ApiResponse({ status: 201, description: 'Usuario creado (rol por defecto)' })
  @ApiResponse({ status: 409, description: 'Ya existe un usuario con ese email' })
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Confirmar la cuenta con el token del email de verificación (público)' })
  @ApiResponse({ status: 200, description: 'Cuenta verificada' })
  @ApiResponse({ status: 403, description: 'El enlace venció' })
  @ApiResponse({ status: 404, description: 'Token inválido' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.service.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reenviar el correo de verificación a la propia cuenta' })
  @ApiResponse({ status: 200, description: 'Correo reenviado (o la cuenta ya estaba verificada)' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  resendVerification(@CurrentUser() user: AuthUser) {
    return this.service.resendVerification(user.id);
  }

  @Post('me/moderator-requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Pedir convertirse en moderador de una localidad ("aval municipal"). La cuenta sigue activa como ciudadano normal mientras se revisa',
  })
  @ApiResponse({ status: 201, description: 'Solicitud creada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Ya sos moderador' })
  @ApiResponse({ status: 409, description: 'Ya tenés una solicitud pendiente' })
  requestModerator(
    @Body() dto: CreateModeratorRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.requestModerator(dto, user);
  }

  // IMPORTANTE: estas dos rutas van ANTES de @Get(':id')/@Patch(':id')/
  // @Delete(':id'). Si estuvieran después, Nest interpretaría
  // "moderator-requests" como si fuera el :id numérico y rompería con
  // ParseIntPipe -- mismo motivo por el que 'me' va antes también.
  @Get('moderator-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Listar las solicitudes de moderador pendientes (todas; el frontend acota a las localidades propias, igual que con organizaciones)',
  })
  @ApiResponse({ status: 200, description: 'Listado de solicitudes' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene rol moderador' })
  findModeratorRequests() {
    return this.service.findModeratorRequests();
  }

  @Patch('moderator-requests/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Aprobar una solicitud de moderador -- promueve la cuenta y le asigna la localidad pedida (solo un moderador que ya tenga esa localidad puede hacerlo)',
  })
  @ApiResponse({ status: 200, description: 'Solicitud aprobada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene rol moderador, o no tiene asignada esa localidad' })
  @ApiResponse({ status: 404, description: 'Solicitud inexistente' })
  approveModeratorRequest(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.approveModeratorRequest(id, user);
  }

  @Delete('moderator-requests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rechazar una solicitud de moderador (la elimina)' })
  @ApiResponse({ status: 200, description: 'Solicitud rechazada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene rol moderador, o no tiene asignada esa localidad' })
  @ApiResponse({ status: 404, description: 'Solicitud inexistente' })
  rejectModeratorRequest(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.rejectModeratorRequest(id, user);
  }

  // IMPORTANTE: esta ruta va ANTES de @Get(':id'). Si estuviera después,
  // Nest interpretaría "me" como si fuera el :id numérico y rompería con
  // ParseIntPipe.
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Ver el propio perfil (cualquier usuario logueado, incluye organizationId/ciudad)',
  })
  @ApiResponse({ status: 200, description: 'Perfil del usuario logueado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  getMe(@CurrentUser() user: AuthUser) {
    return this.service.findOne(user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos los usuarios (solo moderador)' })
  @ApiResponse({ status: 200, description: 'Listado de usuarios' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene rol moderador' })
  findAll() {
    return this.service.findAll();
  }
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ver el detalle de un usuario (solo moderador)' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene rol moderador' })
  @ApiResponse({ status: 404, description: 'Usuario inexistente' })
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.service.findOne(id);
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Editar el propio perfil, o el de otro usuario si sos moderador. roleId/organizationId/ciudad solo los puede cambiar un moderador',
  })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'No es el propio usuario ni moderador, o intenta cambiar un campo protegido',
  })
  @ApiResponse({ status: 404, description: 'Usuario inexistente' })
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
  @ApiOperation({ summary: 'Eliminar un usuario (solo moderador)' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene rol moderador' })
  @ApiResponse({ status: 404, description: 'Usuario inexistente' })
  remove(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.service.remove(id);
  }

  @Post(':id/localities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Asignarle una localidad a un moderador (solo otro moderador puede hacerlo)',
  })
  @ApiResponse({ status: 201, description: 'Localidad asignada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene rol moderador' })
  @ApiResponse({ status: 404, description: 'Usuario inexistente' })
  addLocality(
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    dto: AddModeratorLocalityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addLocality(id, dto, user);
  }

  @Delete(':id/localities/:localityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Quitarle una localidad a un moderador (solo otro moderador)',
  })
  @ApiResponse({ status: 200, description: 'Localidad quitada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene rol moderador' })
  @ApiResponse({ status: 404, description: 'La localidad no está asignada a ese usuario' })
  removeLocality(
    @Param('id', ParseIntPipe)
    id: number,
    @Param('localityId', ParseIntPipe)
    localityId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeLocality(id, localityId, user);
  }
}
