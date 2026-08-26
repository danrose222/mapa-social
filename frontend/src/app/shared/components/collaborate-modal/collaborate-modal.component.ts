import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PublicationsService } from '../../../core/services/publications.service';
import { Resource } from '../../../core/models/mapa-social.model';
import { IconComponent } from '../../icons/icon.component';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';

// Modal "Quiero Colaborar": para un no-logueado (o logueado, da igual) que
// quiere ofrecerse a una organización sin exponer contacto personal de
// terceros ni necesitar cuenta previa. Solo muestra info pública y segura
// de la organización -- nunca teléfono/email de sus miembros ni datos de
// quién pidió ayuda.
@Component({
  selector: 'app-collaborate-modal',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, ModalShellComponent],
  templateUrl: './collaborate-modal.component.html',
  styleUrl: './collaborate-modal.component.scss',
})
export class CollaborateModalComponent {
  @Input({ required: true }) resource!: Resource;

  @Output() closed = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly publicationsService = inject(PublicationsService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly success = signal(false);

  readonly form = this.fb.nonNullable.group({
    contactName: ['', [Validators.required, Validators.maxLength(150)]],
    contactEmail: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    message: ['', [Validators.maxLength(1000)]],
    // Honeypot anti-spam: campo oculto por CSS, ver la plantilla.
    website: [''],
  });

  get organizationTypeLabel(): string {
    return this.resource?.organization?.type === 'ong' ? 'ONG' : 'Comunidad organizada';
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.publicationsService
      .contactAboutResource(this.resource.id, {
        contactName: raw.contactName,
        contactEmail: raw.contactEmail,
        message: raw.message || undefined,
        website: raw.website || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.success.set(true);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            error.status === 429
              ? 'Demasiados intentos. Esperá un momento y volvé a intentar.'
              : 'No se pudo enviar tu mensaje. Intentá de nuevo.',
          );
        },
      });
  }
}
