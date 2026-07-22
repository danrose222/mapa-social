import { SelectQueryBuilder } from 'typeorm';
import { Need } from '../entities/need.entity';
import { SearchNeedsDto } from '../dto/search-needs.dto';
import { SearchStrategy } from './search-strategy.interface';

export class ByDistanceStrategy implements SearchStrategy {
  applies(dto: SearchNeedsDto): boolean {
    return !!(dto.lat && dto.lng && dto.radius);
  }

  apply(qb: SelectQueryBuilder<Need>, dto: SearchNeedsDto): SelectQueryBuilder<Need> {
    return qb.andWhere(
      `(6371 * acos(
          cos(radians(:lat)) * cos(radians(entity.latitude))
          * cos(radians(entity.longitude) - radians(:lng))
          + sin(radians(:lat)) * sin(radians(entity.latitude))
        )) < :radius`,
      { lat: dto.lat, lng: dto.lng, radius: dto.radius },
    );
  }
}