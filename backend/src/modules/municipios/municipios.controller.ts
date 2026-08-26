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

import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { MunicipiosService } from './municipios.service';

import { CreateMunicipioDto } from './dto/create-municipio.dto';
import { UpdateMunicipioDto } from './dto/update-municipio.dto';
import { CheckCiudadDto } from './dto/check-ciudad.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Municipios')
@Controller('municipios')
export class MunicipiosController {
  constructor(private readonly service: MunicipiosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un municipio (solo moderador)' })
  @ApiResponse({ status: 201, description: 'Municipio creado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene rol moderador' })
  create(@Body() dto: CreateMunicipioDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los municipios (público)' })
  @ApiResponse({ status: 200, description: 'Listado de municipios' })
  findAll() {
    return this.service.findAll();
  }

  @Get('check')
  @ApiOperation({
    summary:
      'Verificar si una ciudad tiene Municipio registrado (público; feedback en tiempo real del selector de localidad al registrar una organización)',
  })
  @ApiResponse({ status: 200, description: 'Resultado de la verificación' })
  checkCiudad(@Query() dto: CheckCiudadDto) {
    return this.service.checkCiudad(dto.ciudad ?? '');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver el detalle de un municipio (público)' })
  @ApiResponse({ status: 200, description: 'Municipio encontrado' })
  @ApiResponse({ status: 404, description: 'Municipio inexistente' })
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar un municipio (solo moderador)' })
  @ApiResponse({ status: 200, description: 'Municipio actualizado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene rol moderador' })
  @ApiResponse({ status: 404, description: 'Municipio inexistente' })
  update(
    @Param('id', ParseIntPipe)
    id: number,
    @Body() dto: UpdateMunicipioDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderador')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un municipio (solo moderador)' })
  @ApiResponse({ status: 200, description: 'Municipio eliminado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene rol moderador' })
  @ApiResponse({ status: 404, description: 'Municipio inexistente' })
  remove(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.service.remove(id);
  }
}
