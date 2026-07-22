import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { Need } from '../entities/need.entity';
import { SearchNeedsDto } from '../dto/search-needs.dto';
import { SearchStrategy } from './search-strategy.interface';
import { ByCategoryStrategy } from './by-category.strategy';
import { ByDistanceStrategy } from './by-distance.strategy';

@Injectable()
export class SearchService {
  private readonly strategies: SearchStrategy[] = [
    new ByCategoryStrategy(),
    new ByDistanceStrategy(),
  ];

  applyFilters(
    qb: SelectQueryBuilder<Need>,
    dto: SearchNeedsDto,
  ): SelectQueryBuilder<Need> {
    for (const strategy of this.strategies) {
      if (strategy.applies(dto)) {
        qb = strategy.apply(qb, dto);
      }
    }
    return qb;
  }
}