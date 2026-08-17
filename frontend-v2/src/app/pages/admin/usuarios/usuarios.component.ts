import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

interface AdminUserRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: { id: number; name: string };
  organization?: { id: number; name: string; verified: boolean } | null;
}

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss',
})
export class AdminUsuariosComponent {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(true);
  readonly loadError = signal(false);
  readonly users = signal<AdminUserRow[]>([]);
  readonly actionError = signal('');
  readonly processingId = signal<number | null>(null);

  readonly myId = computed(() => this.authService.profile()?.id);

  readonly adminCount = computed(
    () => this.users().filter((u) => u.role.name === 'admin').length,
  );

  constructor() {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.loadError.set(false);

    this.http.get<AdminUserRow[]>('/api/users').subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set(true);
      },
    });
  }

  isOnlyAdmin(user: AdminUserRow): boolean {
    return user.role.name === 'admin' && this.adminCount() <= 1;
  }

  promoteToModerator(user: AdminUserRow): void {
    this.changeRole(user, 2, 'moderador');
  }

  promoteToAdmin(user: AdminUserRow): void {
    this.changeRole(user, 3, 'admin');
  }

  demoteToVecino(user: AdminUserRow): void {
    this.changeRole(user, 1, 'vecino');
  }

  private changeRole(user: AdminUserRow, roleId: number, label: string): void {
    this.processingId.set(user.id);
    this.actionError.set('');

    this.http.patch(`/api/users/${user.id}`, { roleId }).subscribe({
      next: () => {
        this.processingId.set(null);
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.processingId.set(null);
        this.actionError.set(
          error.error?.message ?? `No se pudo cambiar el rol a ${label}.`,
        );
      },
    });
  }
}
