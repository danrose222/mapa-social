import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Need } from '../needs/entities/need.entity';
import { Resource } from '../resources/entities/resource.entity';

export interface CategoryCount {
  categoryId: number;
  categoryName: string;
  count: number;
}

function toPercentage(resolved: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((resolved / total) * 10000) / 100;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Need)
    private readonly needsRepository: Repository<Need>,

    @InjectRepository(Resource)
    private readonly resourcesRepository: Repository<Resource>,
  ) {}

  private async countByCategory(
    repository: Repository<Need> | Repository<Resource>,
  ): Promise<CategoryCount[]> {
    const rows = await repository
      .createQueryBuilder('entity')
      .leftJoin('entity.category', 'category')
      .select('entity.categoryId', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('COUNT(entity.id)', 'count')
      .groupBy('entity.categoryId')
      .addGroupBy('category.name')
      .getRawMany<{ categoryId: number; categoryName: string; count: string }>();

    return rows.map((row) => ({
      categoryId: Number(row.categoryId),
      categoryName: row.categoryName,
      count: Number(row.count),
    }));
  }

  async overview() {
    const [needsByCategory, resourcesByCategory] = await Promise.all([
      this.countByCategory(this.needsRepository),
      this.countByCategory(this.resourcesRepository),
    ]);

    const [needsTotal, needsResolved, resourcesTotal, resourcesResolved] =
      await Promise.all([
        this.needsRepository.count(),
        this.needsRepository.count({ where: { status: 'resuelta' } }),
        this.resourcesRepository.count(),
        this.resourcesRepository.count({ where: { status: 'agotado' } }),
      ]);

    return {
      needsByCategory,
      resourcesByCategory,
      needsTotal,
      needsResolved,
      needsResolvedPercentage: toPercentage(needsResolved, needsTotal),
      resourcesTotal,
      resourcesResolved,
      resourcesResolvedPercentage: toPercentage(
        resourcesResolved,
        resourcesTotal,
      ),
    };
  }
}
