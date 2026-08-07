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
  ) {}

  async create(userId: number, dto: CreateResourceDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('Usuario inexistente');
    }

    const isModerator = user.role.name === 'moderador';
    const isApprovedOrganization =
      ['comunidad', 'ong'].includes(user.role.name) && user.approved;

    if (!isModerator && !isApprovedOrganization) {
      throw new ForbiddenException(
        'Solo una comunidad u ONG aprobada por un moderador puede publicar recursos',
      );
    }

    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoría inexistente');
    }

    return this.repository.save(
      this.repository.create({ ...dto, userId }),
    );
  }

  findAll() {
    return this.repository.find({
      relations: ['user', 'category'],
      order: {
        id: 'ASC',
      },
    });
  }

  findOne(id: number) {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'category'],
    });
  }

  async findOrganizations(): Promise<string[]> {
    const rows = await this.repository
      .createQueryBuilder('entity')
      .select('DISTINCT entity.organizationName', 'organizationName')
      .where('entity.organizationName IS NOT NULL')
      .getRawMany<{ organizationName: string }>();

    return rows.map((row) => row.organizationName);
  }

  findByOrganization(name: string) {
    return this.repository.find({
      where: {
        organizationName: name,
        status: 'available',
      },
      relations: ['user', 'category'],
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

    const previousStatus = resource.status;

    Object.assign(resource, dto);

    if (dto.status === 'agotado') {
      resource.resolvedBy = currentUser.id;
      resource.resolvedAt = new Date();
    } else if (dto.status !== undefined && previousStatus === 'agotado') {
      resource.resolvedBy = null;
      resource.resolvedAt = null;
    }

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
