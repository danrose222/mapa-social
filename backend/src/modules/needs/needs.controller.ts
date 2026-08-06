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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

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

  // Muestra contactName/contactInfo a: moderador, el dueño individual
  // de la publicación, o cualquier miembro de la organización dueña.
  // Al público general y a otros ciudadanos logueados se les oculta
  // (decisión del equipo: para eso está el canal de Solicitudes, no
  // hace falta exponer el contacto en el mapa abierto).
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
  create(@Body() dto: CreateNeedDto, @CurrentUser() user: AuthUser) {
    return this.service.create(user.id, dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  async findAll(@CurrentUser() user: AuthUser | null) {
    const needs = await this.service.findAll();
    return needs.map((n) => this.hideContactUnlessAuthorized(n, user));
  }

  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
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
  remove(
    @Param('id', ParseIntPipe)
    id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user);
  }
}
