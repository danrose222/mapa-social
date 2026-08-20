import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface CategoryStat {
  categoryId: number;
  categoryName: string;
  needsCount: number;
  resourcesCount: number;
}

interface LocalityStat {
  locality: string;
  count: number;
}

interface ResolutionStat {
  needs: { total: number; resolved: number; pending: number; resolvedPercentage: number };
  resources: { total: number; resolved: number; available: number; resolvedPercentage: number };
}

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.scss',
})
export class EstadisticasComponent {
  private readonly http = inject(HttpClient);

  readonly isLoading = signal(true);
  readonly loadError = signal(false);

  readonly byCategory = signal<CategoryStat[]>([]);
  readonly byLocality = signal<LocalityStat[]>([]);
  readonly resolution = signal<ResolutionStat | null>(null);

  readonly maxCategoryCount = computed(() =>
    Math.max(1, ...this.byCategory().map((c) => Math.max(c.needsCount, c.resourcesCount))),
  );

  readonly maxLocalityCount = computed(() =>
    Math.max(1, ...this.byLocality().map((l) => l.count)),
  );

  constructor() {
    Promise.all([
      this.http.get<CategoryStat[]>('/api/stats/by-category').toPromise(),
      this.http.get<LocalityStat[]>('/api/stats/by-locality').toPromise(),
      this.http.get<ResolutionStat>('/api/stats/resolution-rate').toPromise(),
    ])
      .then(([category, locality, resolution]) => {
        this.byCategory.set(category ?? []);
        this.byLocality.set(locality ?? []);
        this.resolution.set(resolution ?? null);
        this.isLoading.set(false);
      })
      .catch(() => {
        this.isLoading.set(false);
        this.loadError.set(true);
      });
  }

  barWidth(count: number, max: number): string {
    return `${Math.max(4, Math.round((count / max) * 100))}%`;
  }
}
