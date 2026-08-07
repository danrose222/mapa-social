import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

interface OrganizacionPendiente {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organizationName?: string;
  address?: string;
  schedule?: string;
  role: { name: 'comunidad' | 'ong' };
  offeredCategories?: { id: number; name: string }[];
}

const ETIQUETA_POR_ROL: Record<string, string> = {
  comunidad: 'Comunidad',
  ong: 'ONG',
};

@Component({
  selector: 'app-organizaciones-pendientes',
  standalone: true,
  imports: [MatButtonModule, MatCardModule],
  templateUrl: './organizaciones-pendientes.component.html',
  styleUrl: './organizaciones-pendientes.component.scss',
})
export class OrganizacionesPendientesComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly organizaciones = signal<OrganizacionPendiente[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly approvingId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarPendientes();
  }

  etiquetaRol(organizacion: OrganizacionPendiente): string {
    return ETIQUETA_POR_ROL[organizacion.role?.name] ?? organizacion.role?.name;
  }

  private cargarPendientes(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.http
      .get<OrganizacionPendiente[]>('/api/users/pending-approvals')
      .subscribe({
        next: (organizaciones) => {
          this.organizaciones.set(organizaciones);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set(
            'No se pudieron cargar las organizaciones pendientes.',
          );
          this.isLoading.set(false);
        },
      });
  }

  aprobar(id: number): void {
    this.approvingId.set(id);

    this.http.patch(`/api/users/${id}`, { approved: true }).subscribe({
      next: () => {
        this.approvingId.set(null);
        this.organizaciones.update((lista) =>
          lista.filter((organizacion) => organizacion.id !== id),
        );
      },
      error: () => {
        this.approvingId.set(null);
        this.errorMessage.set('No se pudo aprobar la organización.');
      },
    });
  }
}
