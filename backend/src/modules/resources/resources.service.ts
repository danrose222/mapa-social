import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Resource } from './entities/resource.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { OrganizationsService } from '../organizations/organizations.service';

import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

interface AuthUser {
  id: number;
  role: string;
}

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private readonly repository: Repository<Resource>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    private readonly organizationsService: OrganizationsService,
  ) {}

  async create(currentUser: AuthUser, dto: CreateResourceDto) {
    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!user) {
      throw new NotFoundException('Usuario inexistente');
    }

    const isModerator = currentUser.role === 'moderador';
    let organizationVerified = false;

    if (user.organizationId) {
      const organization = await this.organizationsService.findOne(
        user.organizationId,
      );
      organizationVerified = organization.verified;
    }

    if (!isModerator && !organizationVerified) {
      throw new ForbiddenException(
        'Solo un moderador o un usuario de una organización avalada puede publicar un recurso',
      );
    }

    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoría inexistente');
    }

    return this.repository.save(
      this.repository.create({
        ...dto,
        userId: user.id,
        organizationId: user.organizationId,
      }),
    );
  }

  findAll() {
    return this.repository.find({
      relations: ['user', 'category', 'organization'],
      order: {
        id: 'ASC',
      },
    });
  }

  findOne(id: number) {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'category', 'organization'],
    });
  }

  private assertCanModify(resource: Resource, currentUser: AuthUser) {
    const isOwner = resource.userId === currentUser.id;
    const isModerator = currentUser.role === 'moderador';

    if (!isOwner && !isModerator) {
      throw new ForbiddenException(
        'No podés modificar un recurso que no es tuyo',
      );
    }
  }

  async update(id: number, dto: UpdateResourceDto, currentUser: AuthUser) {
    const resource = await this.repository.findOne({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundException('Recurso inexistente');
    }

    this.assertCanModify(resource, currentUser);

    const isModerator = currentUser.role === 'moderador';

    if (dto.status !== undefined && !isModerator) {
      throw new ForbiddenException(
        'Solo un moderador puede cambiar el estado del recurso',
      );
    }

    Object.assign(resource, dto);

    return this.repository.save(resource);
  }

  async remove(id: number, currentUser: AuthUser) {
    const resource = await this.repository.findOne({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundException('Recurso inexistente');
    }

    this.assertCanModify(resource, currentUser);

    await this.repository.remove(resource);

    return {
      message: 'Recurso eliminado',
    };
  }
}
