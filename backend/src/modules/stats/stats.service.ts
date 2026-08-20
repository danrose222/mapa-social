import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Need } from '../needs/entities/need.entity';
import { Resource } from '../resources/entities/resource.entity';
import { Category } from '../categories/entities/category.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Need)
    private readonly needRepository: Repository<Need>,

    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  // Conteo de necesidades y recursos por categoría.
  async byCategory() {
    const categories = await this.categoryRepository.find({ where: { active: true } });

    const needRows = await this.needRepository
      .createQueryBuilder('n')
      .select('n.categoryId', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('n.categoryId')
      .getRawMany<{ categoryId: number; count: string }>();

    const resourceRows = await this.resourceRepository
      .createQueryBuilder('r')
      .select('r.categoryId', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.categoryId')
      .getRawMany<{ categoryId: number; count: string }>();

    const needsByCategory = new Map(needRows.map((r) => [r.categoryId, Number(r.count)]));
    const resourcesByCategory = new Map(
      resourceRows.map((r) => [r.categoryId, Number(r.count)]),
    );

    return categories.map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      needsCount: needsByCategory.get(category.id) ?? 0,
      resourcesCount: resourcesByCategory.get(category.id) ?? 0,
    }));
  }

  // Conteo de necesidades por localidad -- solo necesidades: son las que
  // tienen un campo de localidad normalizado. Los recursos hoy solo
  // guardan 'address' en texto libre, sin una columna de zona equivalente.
  async byLocality() {
    const rows = await this.needRepository
      .createQueryBuilder('n')
      .select('n.locality', 'locality')
      .addSelect('COUNT(*)', 'count')
      .where('n.locality IS NOT NULL')
      .andWhere("n.locality != ''")
      .groupBy('n.locality')
      .orderBy('count', 'DESC')
      .getRawMany<{ locality: string; count: string }>();

    return rows.map((r) => ({ locality: r.locality, count: Number(r.count) }));
  }

  // % resuelto vs pendiente, para necesidades y recursos por separado.
  async resolutionRate() {
    const [needsTotal, needsResolved, resourcesTotal, resourcesResolved] = await Promise.all([
      this.needRepository.count(),
      this.needRepository.count({ where: { status: 'resolved' } }),
      this.resourceRepository.count(),
      this.resourceRepository.count({ where: { status: 'resolved' } }),
    ]);

    const pct = (part: number, total: number) =>
      total === 0 ? 0 : Math.round((part / total) * 1000) / 10;

    return {
      needs: {
        total: needsTotal,
        resolved: needsResolved,
        pending: needsTotal - needsResolved,
        resolvedPercentage: pct(needsResolved, needsTotal),
      },
      resources: {
        total: resourcesTotal,
        resolved: resourcesResolved,
        available: resourcesTotal - resourcesResolved,
        resolvedPercentage: pct(resourcesResolved, resourcesTotal),
      },
    };
  }
}
