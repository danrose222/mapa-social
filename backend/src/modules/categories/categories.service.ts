import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Category } from './entities/category.entity';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>,
  ) {}

  create(dto: CreateCategoryDto) {
    const category = this.repository.create(dto);

    return this.repository.save(category);
  }

  findAll() {
    return this.repository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    const category = await this.repository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Categoría inexistente');
    }

    return category;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    Object.assign(category, dto);

    return this.repository.save(category);
  }

  async remove(id: number) {
    const category = await this.findOne(id);

    await this.repository.remove(category);

    return {
      message: 'Categoría eliminada',
    };
  }
}
