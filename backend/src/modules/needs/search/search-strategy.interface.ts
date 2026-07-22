import { SelectQueryBuilder } from 'typeorm';
import { Need } from '../entities/need.entity';
import { SearchNeedsDto } from '../dto/search-needs.dto';

export interface SearchStrategy {
  applies(dto: SearchNeedsDto): boolean;
  apply(qb: SelectQueryBuilder<Need>, dto: SearchNeedsDto): SelectQueryBuilder<Need>;
}