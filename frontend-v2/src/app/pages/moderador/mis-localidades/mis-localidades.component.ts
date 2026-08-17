import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import {
  ModeratorLocalitiesService,
  ModeratorLocalityRecord,
} from '../../../core/services/moderator-localities.service';
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

  readonly localities = computed<ModeratorLocalityRecord[]>(
    () => (this.authService.profile()?.localities as ModeratorLocalityRecord[]) ?? [],
  );

  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  addLocality(selection: LocalitySelection): void {
    const userId = this.authService.profile()?.id;

    if (!userId || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    this.localitiesService.add(userId, selection).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.authService.refreshProfile().subscribe();
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.errorMessage.set(
          error.status === 403
            ? 'Solo un moderador puede asignar localidades.'
            : 'No se pudo agregar la localidad. Intentá de nuevo.',
        );
      },
    });
  }

  removeLocality(localityId: number): void {
    const userId = this.authService.profile()?.id;

    if (!userId) {
      return;
    }

    this.localitiesService.remove(userId, localityId).subscribe({
      next: () => this.authService.refreshProfile().subscribe(),
      error: () => this.errorMessage.set('No se pudo quitar la localidad. Intentá de nuevo.'),
    });
  }
}
