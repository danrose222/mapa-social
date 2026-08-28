import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { PublicationsService } from '../../../core/services/publications.service';
import { Resource } from '../../../core/models/mapa-social.model';
import { IconComponent } from '../../icons/icon.component';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';

// Modal "express" para un usuario YA logueado que pide un recurso puntual:
// a diferencia de CollaborateModalComponent (anónimo, pide nombre/email),
// acá el contacto y la jurisdicción se heredan de la cuenta -- lo único
// que pide es el detalle específico. Ver ResourcesService.requestResource
// en el backend.
@Component({
  selector: 'app-resource-request-modal',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, ModalShellComponent],
  templateUrl: './resource-request-modal.component.html',
  styleUrl: './resource-request-modal.component.scss',
})
export class ResourceRequestModalComponent {
  @Input({ required: true }) resource!: Resource;
  @Input() categoryName = '';

  @Output() closed = new EventEmitter<void>();

  private readonly authService = inject(AuthService);
  private readonly publicationsService = inject(PublicationsService);
  private readonly fb = inject(FormBuilder);

  readonly profile = this.authService.profile;

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly success = signal(false);

  readonly form = this.fb.nonNullable.group({
    detailText: ['', [Validators.maxLength(500)]],
  });

  constructor() {
    // AuthService solo refresca el perfil una vez, en su propio
    // constructor -- si este modal se abre antes de que esa llamada
    // resuelva (o si el singleton se creó sin token todavía), profile()
    // queda vacío y el contacto/jurisdicción no se completan solos. Mismo
    // patrón que ya usa MiOrganizacionComponent para no depender de eso.
    this.authService.refreshProfile().subscribe();
  }

  get contactDisplay(): string {
    const profile = this.profile();
    return profile?.phone || profile?.email || 'No completado en tu perfil';
  }

  get jurisdiccionDisplay(): string {
    return (
      this.profile()?.ciudad ||
      this.resource.organization?.ciudad ||
      'No especificada'
    );
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.publicationsService
      .requestResource(this.resource.id, {
        detailText: this.form.getRawValue().detailText || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.success.set(true);
          // Cajero: confirmación breve y cierre solo, sin pantallas extra.
          setTimeout(() => this.close(), 2200);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            error.status === 401
              ? 'Tu sesión expiró. Iniciá sesión de nuevo.'
              : error.status === 403
                ? (error.error?.message ?? 'No podés enviar esta solicitud en este momento.')
                : 'No se pudo enviar la solicitud. Intentá de nuevo.',
          );
        },
      });
  }
}
