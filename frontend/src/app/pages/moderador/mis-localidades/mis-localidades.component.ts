import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ModeratorLocalityRecord } from '../../../core/services/moderator-localities.service';

@Component({
  selector: 'app-mis-localidades',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './mis-localidades.component.html',
  styleUrl: './mis-localidades.component.scss',
})
export class MisLocalidadesComponent {
  private readonly authService = inject(AuthService);

  readonly localities = computed<ModeratorLocalityRecord[]>(
    () => (this.authService.profile()?.localities as ModeratorLocalityRecord[]) ?? [],
  );
}
