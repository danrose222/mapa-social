import { SelectQueryBuilder } from 'typeorm';
import { Need } from '../entities/need.entity';
import { SearchNeedsDto } from '../dto/search-needs.dto';
import { SearchStrategy } from './search-strategy.interface';
import { haversineDistanceExpr } from '../../../common/utils/haversine.util';

export class ByDistanceStrategy implements SearchStrategy {
  applies(dto: SearchNeedsDto): boolean {
    // Number.isFinite (no !!) porque lat/lng en 0 son valores válidos --
    // es, entre otras cosas, el fallback típico cuando la geolocalización
    // del navegador falla. Con !!, "0 && ..." da falsy y el filtro de
    // distancia se salteaba en silencio.
    return (
      Number.isFinite(dto.lat) && Number.isFinite(dto.lng) && !!dto.radius
    );
  }

  apply(qb: SelectQueryBuilder<Need>, dto: SearchNeedsDto): SelectQueryBuilder<Need> {
    return qb.andWhere(
      `${haversineDistanceExpr('entity', 'lat', 'lng')} < :radius`,
      { lat: dto.lat, lng: dto.lng, radius: dto.radius },
    );
  }
}
