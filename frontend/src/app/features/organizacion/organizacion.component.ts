import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { MatCardModule } from '@angular/material/card';

interface RecursoOrganizacion {
  id: number;
  title: string;
  description: string;
  schedule?: string;
  address?: string;
}

@Component({
  selector: 'app-organizacion',
  standalone: true,
  imports: [MatCardModule],
  templateUrl: './organizacion.component.html',
  styleUrl: './organizacion.component.scss',
})
export class OrganizacionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  nombre = '';
  recursos: RecursoOrganizacion[] = [];
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.nombre = this.route.snapshot.paramMap.get('nombre') ?? '';
    this.cargarRecursos();
  }

  private async cargarRecursos(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await fetch(
        `/api/resources/by-organization/${encodeURIComponent(this.nombre)}`,
      );

      if (!response.ok) {
        throw new Error(`Error al cargar recursos: ${response.status}`);
      }

      this.recursos = await response.json();
    } catch {
      this.errorMessage =
        'No se pudieron cargar los recursos de esta organización.';
    } finally {
      this.isLoading = false;
    }
  }
}
