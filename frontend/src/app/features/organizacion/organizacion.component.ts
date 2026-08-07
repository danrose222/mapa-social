import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { MatCardModule } from '@angular/material/card';

interface RecursoOrganizacion {
  id: number;
  title: string;
  description: string;
  schedule?: string;
  address?: string;
  // Solo se usa el de la primera necesidad de la lista para el link de
  // "avalar autenticidad" en el encabezado (ver websiteUrl()): todos los
  // recursos de esta respuesta son de la misma organización, así que
  // cualquiera de ellos trae el mismo dato.
  user?: { websiteUrl?: string };
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
  readonly recursos = signal<RecursoOrganizacion[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  // Señal de autenticidad de la organización, no de un recurso puntual: se
  // muestra en el encabezado de la página, no en cada tarjeta.
  readonly websiteUrl = computed(
    () => this.recursos()[0]?.user?.websiteUrl,
  );

  ngOnInit(): void {
    this.nombre = this.route.snapshot.paramMap.get('nombre') ?? '';
    this.cargarRecursos();
  }

  private async cargarRecursos(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const response = await fetch(
        `/api/resources/by-organization/${encodeURIComponent(this.nombre)}`,
      );

      if (!response.ok) {
        throw new Error(`Error al cargar recursos: ${response.status}`);
      }

      this.recursos.set(await response.json());
    } catch {
      this.errorMessage.set(
        'No se pudieron cargar los recursos de esta organización.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
