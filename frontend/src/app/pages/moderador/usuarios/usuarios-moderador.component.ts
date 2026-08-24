import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ManagedUser, UsersService } from '../../../core/services/users.service';
import { RolesService } from '../../../core/services/roles.service';
import { ModeratorLocalitiesService } from '../../../core/services/moderator-localities.service';
import { normalizeText } from '../../../shared/utils/normalize-text.util';

@Component({
  selector: 'app-usuarios-moderador',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './usuarios-moderador.component.html',
  styleUrl: './usuarios-moderador.component.scss',
})
export class UsuariosModeradorComponent {
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);
  private readonly moderatorLocalitiesService = inject(ModeratorLocalitiesService);

  readonly isLoading = signal(true);
  readonly loadError = signal(false);
  readonly allUsers = signal<ManagedUser[]>([]);
  readonly searchTerm = signal('');
  readonly actionError = signal('');
  readonly processingId = signal<number | null>(null);

  // roleId de 'moderador' resuelto contra /roles en vez de hardcodearlo --
  // en el seed es 2, pero no hay ninguna garantía de que lo siga siendo.
  private readonly moderatorRoleId = signal<number | null>(null);

  // Localidad elegida en el <select> de "otorgar", una por usuario --
  // así cada fila mantiene su propia selección sin pisar la de las demás.
  private readonly selectedLocality = signal<Record<number, string>>({});

  readonly myLocalities = computed(() => this.authService.profile()?.localities ?? []);

  private readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? null);

  // Uno mismo no aparece en la lista -- otorgarse/quitarse rol o
  // localidades a uno mismo ya está prohibido en el backend (ver
  // users.service.ts), mostrar la fila solo invitaría a un 403 confuso.
  readonly users = computed(() => {
    const term = normalizeText(this.searchTerm());

    return this.allUsers()
      .filter((u) => u.id !== this.currentUserId())
      .filter(
        (u) =>
          term === '' ||
          normalizeText(`${u.firstName} ${u.lastName}`).includes(term) ||
          normalizeText(u.email).includes(term),
      );
  });

  constructor() {
    this.load();

    this.rolesService.getAll().subscribe({
      next: (roles) => {
        this.moderatorRoleId.set(roles.find((r) => r.name === 'moderador')?.id ?? null);
      },
      error: () => {},
    });
  }

  private load(): void {
    this.isLoading.set(true);
    this.loadError.set(false);

    this.usersService.getAll().subscribe({
      next: (users) => {
        this.allUsers.set(users);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set(true);
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  localityChoiceFor(userId: number): string {
    return this.selectedLocality()[userId] ?? '';
  }

  onLocalityChoice(userId: number, value: string): void {
    this.selectedLocality.update((map) => ({ ...map, [userId]: value }));
  }

  promote(user: ManagedUser): void {
    const roleId = this.moderatorRoleId();

    if (!roleId) {
      this.actionError.set('No se pudo resolver el rol de moderador. Recargá la página.');
      return;
    }

    const confirmed = confirm(
      `¿Convertir a "${user.firstName} ${user.lastName}" en moderador? Va a poder avalar organizaciones y moderar publicaciones una vez que le asignes al menos una localidad.`,
    );

    if (!confirmed) {
      return;
    }

    this.processingId.set(user.id);
    this.actionError.set('');

    this.usersService.setRole(user.id, roleId).subscribe({
      next: () => {
        this.processingId.set(null);
        this.load();
      },
      error: () => {
        this.processingId.set(null);
        this.actionError.set('No se pudo convertir en moderador. Intentá de nuevo.');
      },
    });
  }

  grantLocality(user: ManagedUser): void {
    const locality = this.localityChoiceFor(user.id).trim();

    if (!locality) {
      return;
    }

    // Recuperamos la provincia de la propia localidad del moderador que
    // otorga, no de una elegida a mano -- así queda consistente con lo que
    // ya tiene cargado (mismo par locality/provincia que assertCallerHasLocality
    // valida contra en el backend).
    const provincia = this.myLocalities().find((l) => l.locality === locality)?.provincia;

    this.processingId.set(user.id);
    this.actionError.set('');

    this.moderatorLocalitiesService.add(user.id, { locality, provincia }).subscribe({
      next: () => {
        this.processingId.set(null);
        this.onLocalityChoice(user.id, '');
        this.load();
      },
      error: (err) => {
        this.processingId.set(null);
        this.actionError.set(
          err?.error?.message ?? 'No se pudo otorgar la localidad. Intentá de nuevo.',
        );
      },
    });
  }

  revokeLocality(user: ManagedUser, localityId: number, localityName: string): void {
    const confirmed = confirm(`¿Quitarle "${localityName}" a ${user.firstName}?`);

    if (!confirmed) {
      return;
    }

    this.processingId.set(user.id);
    this.actionError.set('');

    this.moderatorLocalitiesService.remove(user.id, localityId).subscribe({
      next: () => {
        this.processingId.set(null);
        this.load();
      },
      error: (err) => {
        this.processingId.set(null);
        this.actionError.set(
          err?.error?.message ?? 'No se pudo quitar la localidad. Intentá de nuevo.',
        );
      },
    });
  }
}
