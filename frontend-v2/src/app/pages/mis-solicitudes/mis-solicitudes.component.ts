import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicationsService } from '../../core/services/publications.service';
import { Solicitud } from '../../core/models/mapa-social.model';

@Component({
  selector: 'app-mis-solicitudes',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './mis-solicitudes.component.html',
  styleUrl: './mis-solicitudes.component.scss',
})
export class MisSolicitudesComponent {
  private readonly publicationsService = inject(PublicationsService);

  readonly isLoading = signal(true);
  readonly loadError = signal(false);
  readonly solicitudes = signal<Solicitud[]>([]);

  constructor() {
    this.publicationsService.getMySolicitudes().subscribe({
      next: (list) => {
        this.solicitudes.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set(true);
      },
    });
  }
}
