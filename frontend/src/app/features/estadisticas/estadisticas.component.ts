import { Component, OnInit } from '@angular/core';

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
  overview: EstadisticasOverview | null = null;
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  private async cargarEstadisticas(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await fetch('/api/stats/overview');

      if (!response.ok) {
        throw new Error(`Error al cargar estadísticas: ${response.status}`);
      }

      this.overview = await response.json();
    } catch {
      this.errorMessage =
        'No se pudieron cargar las estadísticas. Intentá nuevamente más tarde.';
    } finally {
      this.isLoading = false;
    }
  }
}
