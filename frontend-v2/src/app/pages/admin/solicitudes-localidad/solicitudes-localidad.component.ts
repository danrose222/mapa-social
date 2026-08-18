import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  LocalityRequestRecord,
  LocalityRequestsService,
} from '../../../core/services/locality-requests.service';

@Component({
  selector: 'app-solicitudes-localidad',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './solicitudes-localidad.component.html',
  styleUrl: './solicitudes-localidad.component.scss',
})
export class SolicitudesLocalidadComponent {
  private readonly service = inject(LocalityRequestsService);

  readonly isLoading = signal(true);
  readonly loadError = signal(false);
  readonly requests = signal<LocalityRequestRecord[]>([]);
  readonly processingId = signal<number | null>(null);
  readonly actionError = signal('');

  constructor() {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.loadError.set(false);

    this.service.findPending().subscribe({
      next: (list) => {
        this.requests.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set(true);
      },
    });
  }

  respond(request: LocalityRequestRecord, status: 'approved' | 'rejected'): void {
    this.processingId.set(request.id);
    this.actionError.set('');

    this.service.respond(request.id, status).subscribe({
      next: () => {
        this.processingId.set(null);
        this.load();
      },
      error: () => {
        this.processingId.set(null);
        this.actionError.set('No se pudo procesar. Intentá de nuevo.');
      },
    });
  }
}
