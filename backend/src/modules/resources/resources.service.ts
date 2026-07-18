import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Resource } from './entities/resource.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';

import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

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

  async create(dto: CreateResourceDto) {
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

  findOne(id: number) {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'category'],
    });
  }

  async update(id: number, dto: UpdateResourceDto) {
    const resource = await this.repository.findOne({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundException('Necesidad inexistente');
    }

    Object.assign(resource, dto);

    return this.repository.save(resource);
  }

  async remove(id: number) {
    const resource = await this.repository.findOne({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundException('Necesidad inexistente');
    }

    await this.repository.remove(resource);

    return {
      message: 'Necesidad eliminada',
    };
  }
}
