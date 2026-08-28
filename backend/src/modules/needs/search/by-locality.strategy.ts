import { SelectQueryBuilder } from 'typeorm';
import { Need } from '../entities/need.entity';
import { SearchNeedsDto } from '../dto/search-needs.dto';
import { SearchStrategy } from './search-strategy.interface';

export class ByLocalityStrategy implements SearchStrategy {
  applies(dto: SearchNeedsDto): boolean {
    return !!dto.locality;
  }

  apply(qb: SelectQueryBuilder<Need>, dto: SearchNeedsDto): SelectQueryBuilder<Need> {
    // Case-insensitive y sin espacios extra: 'locality' sigue siendo texto
    // libre cargado por cada vecino, así que un match exacto sería
    // demasiado frágil contra mayúsculas o espacios de más.
    return qb.andWhere('LOWER(TRIM(entity.locality)) = LOWER(TRIM(:locality))', {
      locality: dto.locality,
    });
  }
}
