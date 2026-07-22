import { Injectable, NotFoundException } from '@nestjs/common';
import { SearchNeedsDto } from './dto/search-needs.dto';
import { SearchService } from './search/search.service';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Need } from './entities/need.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';

import { CreateNeedDto } from './dto/create-need.dto';
import { UpdateNeedDto } from './dto/update-need.dto';

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

  async create(dto: CreateNeedDto) {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
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

    return this.repository.save(this.repository.create(dto));
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

  async update(id: number, dto: UpdateNeedDto) {
    const need = await this.repository.findOne({
      where: { id },
    });

    if (!need) {
      throw new NotFoundException('Necesidad inexistente');
    }

    Object.assign(need, dto);

    return this.repository.save(need);
  }

  async remove(id: number) {
    const need = await this.repository.findOne({
      where: { id },
    });

    if (!need) {
      throw new NotFoundException('Necesidad inexistente');
    }

    await this.repository.remove(need);

    return {
      message: 'Necesidad eliminada',
    };
  }
}
