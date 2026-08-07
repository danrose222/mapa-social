import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { MatCardModule } from '@angular/material/card';

interface UsuarioOrganizacion {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organizationName?: string;
  address?: string;
  schedule?: string;
  websiteUrl?: string;
  approved: boolean;
  estadoAyuda: 'estable' | 'critico';
  role: { name: 'comunidad' | 'ong' | string };
  offeredCategories?: { id: number; name: string }[];
}

interface RecursoResumen {
  id: number;
  title: string;
  status: string;
  userId: number;
}

interface OrganizacionConRecursos extends UsuarioOrganizacion {
  recursos: RecursoResumen[];
}

@Component({
  selector: 'app-panel-municipio',
  standalone: true,
  imports: [MatCardModule],
  templateUrl: './panel-municipio.component.html',
  styleUrl: './panel-municipio.component.scss',
})
export class PanelMunicipioComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly ongs = signal<OrganizacionConRecursos[]>([]);
  readonly comunidades = signal<OrganizacionConRecursos[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      usuarios: this.http.get<UsuarioOrganizacion[]>('/api/users'),
      recursos: this.http.get<RecursoResumen[]>('/api/resources'),
    }).subscribe({
      next: ({ usuarios, recursos }) => {
        const organizaciones = usuarios
          .filter(
            (usuario) =>
              usuario.approved &&
              (usuario.role.name === 'comunidad' || usuario.role.name === 'ong'),
          )
          .map((usuario) => ({
            ...usuario,
            recursos: recursos.filter((recurso) => recurso.userId === usuario.id),
          }));

        this.ongs.set(organizaciones.filter((org) => org.role.name === 'ong'));
        this.comunidades.set(
          organizaciones.filter((org) => org.role.name === 'comunidad'),
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el panel del municipio.');
        this.isLoading.set(false);
      },
    });
  }
}
