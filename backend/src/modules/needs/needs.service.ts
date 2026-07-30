import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SearchNeedsDto } from './dto/search-needs.dto';
import { SearchService } from './search/search.service';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Need } from './entities/need.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Resource } from '../resources/entities/resource.entity';

import { CreateNeedDto } from './dto/create-need.dto';
import { UpdateNeedDto } from './dto/update-need.dto';

interface AuthUser {
  id: number;
  role: string;
}

@Injectable()
export class NeedsService {
  constructor(
    @InjectRepository(Need)
    private readonly repository: Repository<Need>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
    private readonly searchService: SearchService,
  ) {}

  async create(userId: number, dto: CreateNeedDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario inexistente');
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
  search(dto: SearchNeedsDto) {
    const qb = this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.category', 'category')
      .leftJoinAndSelect('entity.user', 'user')
      .where('entity.status = :status', { status: 'active' });
  
    return this.searchService.applyFilters(qb, dto).getMany();
  }
  findOne(id: number) {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'category'],
    });
  }

  async findMatches(id: number, radius: number) {
    const need = await this.repository.findOne({
      where: { id },
    });

    if (!need) {
      throw new NotFoundException('Necesidad inexistente');
    }

    return this.resourceRepository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.category', 'category')
      .where('entity.categoryId = :categoryId', {
        categoryId: need.categoryId,
      })
      .andWhere('entity.status = :status', { status: 'available' })
      .andWhere(
        `(6371 * acos(
            cos(radians(:lat)) * cos(radians(entity.latitude))
            * cos(radians(entity.longitude) - radians(:lng))
            + sin(radians(:lat)) * sin(radians(entity.latitude))
          )) < :radius`,
        { lat: need.latitude, lng: need.longitude, radius },
      )
      .orderBy(
        `(6371 * acos(
            cos(radians(:lat)) * cos(radians(entity.latitude))
            * cos(radians(entity.longitude) - radians(:lng))
            + sin(radians(:lat)) * sin(radians(entity.latitude))
          ))`,
        'ASC',
      )
      .limit(10)
      .getMany();
  }

  private assertCanModify(need: Need, currentUser: AuthUser) {
    const isOwner = need.userId === currentUser.id;
    const isModerator = currentUser.role === 'moderador';

    if (!isOwner && !isModerator) {
      throw new ForbiddenException(
        'No podés modificar una publicación que no es tuya',
      );
    }
  }

  async update(id: number, dto: UpdateNeedDto, currentUser: AuthUser) {
    const need = await this.repository.findOne({
      where: { id },
    });

    if (!need) {
      throw new NotFoundException('Necesidad inexistente');
    }

    this.assertCanModify(need, currentUser);

    const isModerator = currentUser.role === 'moderador';

    if (dto.status !== undefined && !isModerator) {
      throw new ForbiddenException(
        'Solo un moderador puede cambiar el estado de la publicación',
      );
    }

    const previousStatus = need.status;

    Object.assign(need, dto);

    if (dto.status === 'resuelta') {
      need.resolvedBy = currentUser.id;
      need.resolvedAt = new Date();
    } else if (dto.status !== undefined && previousStatus === 'resuelta') {
      need.resolvedBy = null;
      need.resolvedAt = null;
    }

    return this.repository.save(need);
  }

  async remove(id: number, currentUser: AuthUser) {
    const need = await this.repository.findOne({
      where: { id },
    });

    if (!need) {
      throw new NotFoundException('Necesidad inexistente');
    }

    this.assertCanModify(need, currentUser);

    await this.repository.remove(need);

    return {
      message: 'Necesidad eliminada',
    };
  }
}
