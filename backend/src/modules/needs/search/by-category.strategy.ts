import { SelectQueryBuilder } from 'typeorm';
import { Need } from '../entities/need.entity';
import { SearchNeedsDto } from '../dto/search-needs.dto';
import { SearchStrategy } from './search-strategy.interface';

export class ByCategoryStrategy implements SearchStrategy {
  applies(dto: SearchNeedsDto): boolean {
    return !!dto.category;
  }

  apply(qb: SelectQueryBuilder<Need>, dto: SearchNeedsDto): SelectQueryBuilder<Need> {
    return qb.andWhere('category.name = :category', { category: dto.category });
  }
}