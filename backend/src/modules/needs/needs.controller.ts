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
}

@ApiTags('Needs')
@Controller('needs')
export class NeedsController {
  constructor(private readonly service: NeedsService) {}

  private hideContactIfNotModerator(
    item: Need,
    user: AuthUser | null,
  ): Need {
    if (user?.role === 'moderador') {
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
    return needs.map((n) => this.hideContactIfNotModerator(n, user));
  }

  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  async search(
    @Query() dto: SearchNeedsDto,
    @CurrentUser() user: AuthUser | null,
  ) {
    const needs = await this.service.search(dto);
    return needs.map((n) => this.hideContactIfNotModerator(n, user));
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
    return need ? this.hideContactIfNotModerator(need, user) : need;
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
