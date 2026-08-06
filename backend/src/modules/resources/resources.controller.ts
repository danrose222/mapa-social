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

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ResourcesService } from './resources.service';
import { Resource } from './entities/resource.entity';

import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthUser {
  id: number;
  role: string;
  organizationId?: number | null;
}

@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly service: ResourcesService) {}

  private hideContactUnlessAuthorized(
    item: Resource,
    user: AuthUser | null,
  ): Resource {
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
  create(@Body() dto: CreateResourceDto, @CurrentUser() user: AuthUser) {
    return this.service.create(user, dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  async findAll(@CurrentUser() user: AuthUser | null) {
    const resources = await this.service.findAll();
    return resources.map((r) => this.hideContactUnlessAuthorized(r, user));
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  async findOne(
    @Param('id', ParseIntPipe)
    id: number,
    @CurrentUser() user: AuthUser | null,
  ) {
    const resource = await this.service.findOne(id);
    return resource
      ? this.hideContactUnlessAuthorized(resource, user)
      : resource;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
  remove(
    @Param('id', ParseIntPipe)
    id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user);
  }
}
