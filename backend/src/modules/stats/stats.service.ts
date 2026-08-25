import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Need } from '../needs/entities/need.entity';
import { Resource } from '../resources/entities/resource.entity';
import { Category } from '../categories/entities/category.entity';
import { ModeratorLocality } from '../users/entities/moderator-locality.entity';
import { localitiesMatch } from '../../common/utils/locality-match.util';

interface AuthUser {
  id: number;
  role: string;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Need)
    private readonly needRepository: Repository<Need>,

    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(ModeratorLocality)
    private readonly localityRepository: Repository<ModeratorLocality>,
  ) {}

  // Las localidades se resuelven siempre del JWT (currentUser.id), nunca
  // de un parámetro que mande el cliente -- mismo criterio que ya usa
  // organizations.service.ts para no dejar que un moderador consulte la
  // jurisdicción de otro.
  private async moderatorLocalities(currentUser: AuthUser): Promise<string[]> {
    const localities = await this.localityRepository.find({
      where: { userId: currentUser.id },
    });

    return localities.map((l) => l.locality);
  }

  private needInScope(need: Pick<Need, 'locality'>, moderatorLocalities: string[]): boolean {
    if (!need.locality) {
      return false;
    }

    return moderatorLocalities.some((ml) => localitiesMatch(ml, need.locality!));
  }

  // Resource no tiene columna de localidad propia (solo 'address' en
  // texto libre), así que se aproxima por la ciudad de la organización
  // dueña. Un recurso publicado por un moderador directamente, sin
  // organización, queda fuera del conteo -- limitación conocida hasta que
  // se agregue una columna de localidad real a Resource.
  private resourceInScope(
    resource: { organization?: { ciudad: string } | null },
    moderatorLocalities: string[],
  ): boolean {
    if (!resource.organization?.ciudad) {
      return false;
    }

    return moderatorLocalities.some((ml) =>
      localitiesMatch(ml, resource.organization!.ciudad),
    );
  }

  // Conteo de necesidades y recursos por categoría, acotado a las
  // localidades del moderador logueado.
  async byCategory(currentUser: AuthUser) {
    const [moderatorLocalities, categories, needs, resources] =
      await Promise.all([
        this.moderatorLocalities(currentUser),
        this.categoryRepository.find({ where: { active: true } }),
        this.needRepository.find(),
        this.resourceRepository.find({ relations: ['organization'] }),
      ]);

    const needsInScope = needs.filter((n) =>
      this.needInScope(n, moderatorLocalities),
    );
    const resourcesInScope = resources.filter((r) =>
      this.resourceInScope(r, moderatorLocalities),
    );

    const needsByCategory = new Map<number, number>();
    for (const need of needsInScope) {
      needsByCategory.set(need.categoryId, (needsByCategory.get(need.categoryId) ?? 0) + 1);
    }

    const resourcesByCategory = new Map<number, number>();
    for (const resource of resourcesInScope) {
      resourcesByCategory.set(
        resource.categoryId,
        (resourcesByCategory.get(resource.categoryId) ?? 0) + 1,
      );
    }

    return categories.map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      needsCount: needsByCategory.get(category.id) ?? 0,
      resourcesCount: resourcesByCategory.get(category.id) ?? 0,
    }));
  }

  // Conteo de necesidades por localidad, solo entre las localidades del
  // moderador -- ya no es un ranking sitewide.
  async byLocality(currentUser: AuthUser) {
    const [moderatorLocalities, needs] = await Promise.all([
      this.moderatorLocalities(currentUser),
      this.needRepository.find(),
    ]);
    const needsInScope = needs.filter((n) =>
      this.needInScope(n, moderatorLocalities),
    );

    const counts = new Map<string, number>();
    for (const need of needsInScope) {
      counts.set(need.locality!, (counts.get(need.locality!) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([locality, count]) => ({ locality, count }))
      .sort((a, b) => b.count - a.count);
  }

  // % resuelto vs pendiente, para necesidades y recursos por separado,
  // acotado a las localidades del moderador.
  async resolutionRate(currentUser: AuthUser) {
    const [moderatorLocalities, needs, resources] = await Promise.all([
      this.moderatorLocalities(currentUser),
      this.needRepository.find(),
      this.resourceRepository.find({ relations: ['organization'] }),
    ]);

    const needsInScope = needs.filter((n) =>
      this.needInScope(n, moderatorLocalities),
    );
    const resourcesInScope = resources.filter((r) =>
      this.resourceInScope(r, moderatorLocalities),
    );

    const needsTotal = needsInScope.length;
    const needsResolved = needsInScope.filter((n) => n.status === 'resolved').length;
    const resourcesTotal = resourcesInScope.length;
    const resourcesResolved = resourcesInScope.filter((r) => r.status === 'resolved').length;

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
