import { Component, OnInit, signal } from '@angular/core';

import { MatCardModule } from '@angular/material/card';

interface CategoriaConteo {
  categoryId: number;
  categoryName: string;
  count: number;
}

interface EstadisticasOverview {
  needsByCategory: CategoriaConteo[];
  resourcesByCategory: CategoriaConteo[];
  needsTotal: number;
  needsResolved: number;
  needsResolvedPercentage: number;
  resourcesTotal: number;
  resourcesResolved: number;
  resourcesResolvedPercentage: number;
}

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [MatCardModule],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.scss',
})
export class EstadisticasComponent implements OnInit {
  readonly overview = signal<EstadisticasOverview | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  private async cargarEstadisticas(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const response = await fetch('/api/stats/overview');

      if (!response.ok) {
        throw new Error(`Error al cargar estadísticas: ${response.status}`);
      }

      this.overview.set(await response.json());
    } catch {
      this.errorMessage.set(
        'No se pudieron cargar las estadísticas. Intentá nuevamente más tarde.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
