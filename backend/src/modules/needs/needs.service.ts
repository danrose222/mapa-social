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
      this.repository.create({
        ...dto,
        userId,
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
  search(dto: SearchNeedsDto) {
    const qb = this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.category', 'category')
      .leftJoinAndSelect('entity.user', 'user')
      .leftJoinAndSelect('entity.organization', 'organization')
      .where('entity.status = :status', { status: 'active' });

    return this.searchService.applyFilters(qb, dto).getMany();
  }
  findOne(id: number) {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'category', 'organization'],
    });
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

    Object.assign(need, dto);

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
