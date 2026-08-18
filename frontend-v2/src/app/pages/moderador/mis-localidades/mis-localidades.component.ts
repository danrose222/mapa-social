import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import {
  ModeratorLocalitiesService,
  ModeratorLocalityRecord,
} from '../../../core/services/moderator-localities.service';
import {
  LocalityRequestRecord,
  LocalityRequestsService,
} from '../../../core/services/locality-requests.service';
import {
  LocalityAutocompleteComponent,
  LocalitySelection,
} from '../../../shared/components/locality-autocomplete/locality-autocomplete.component';

@Component({
  selector: 'app-mis-localidades',
  standalone: true,
  imports: [RouterLink, LocalityAutocompleteComponent],
  templateUrl: './mis-localidades.component.html',
  styleUrl: './mis-localidades.component.scss',
})
export class MisLocalidadesComponent {
  private readonly authService = inject(AuthService);
  private readonly localitiesService = inject(ModeratorLocalitiesService);
  private readonly requestsService = inject(LocalityRequestsService);

  readonly localities = computed<ModeratorLocalityRecord[]>(
    () => (this.authService.profile()?.localities as ModeratorLocalityRecord[]) ?? [],
  );

  readonly myRequests = signal<LocalityRequestRecord[]>([]);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  constructor() {
    this.loadMyRequests();
  }

  private loadMyRequests(): void {
    this.requestsService.findMine().subscribe({
      next: (list) => this.myRequests.set(list),
      error: () => {},
    });
  }

  // Ya no se puede asignar una localidad a uno mismo directamente (lo
  // bloqueamos a propósito) -- esto crea un PEDIDO, que un admin tiene que
  // aprobar. Ver /admin/solicitudes-localidad del lado del admin.
  requestLocality(selection: LocalitySelection): void {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.requestsService.create(selection).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.successMessage.set(
          `Pedido enviado para ${selection.locality} — un admin lo tiene que aprobar.`,
        );
        this.loadMyRequests();
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.errorMessage.set(
          error.error?.message ?? 'No se pudo enviar el pedido. Intentá de nuevo.',
        );
      },
    });
  }

  removeLocality(localityId: number): void {
    const userId = this.authService.profile()?.id;

    if (!userId) {
      return;
    }

    this.errorMessage.set('');

    this.localitiesService.remove(userId, localityId).subscribe({
      next: () => this.authService.refreshProfile().subscribe(),
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.status === 403
            ? 'No podés quitarte una localidad a vos mismo -- pedile a un admin.'
            : 'No se pudo quitar la localidad. Intentá de nuevo.',
        );
      },
    });
  }
}
