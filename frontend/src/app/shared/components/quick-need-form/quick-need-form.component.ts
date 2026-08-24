import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PublicationsService } from '../../../core/services/publications.service';
import { Category } from '../../../core/models/mapa-social.model';
import { IconComponent } from '../../icons/icon.component';
import {
  LocalityAutocompleteComponent,
  LocalitySelection,
} from '../locality-autocomplete/locality-autocomplete.component';

// Formulario mínimo para el estado vacío de búsqueda del mapa ("no
// encontraste lo que buscabas -> publicá tu necesidad"): a propósito solo
// pide 3 campos obligatorios (descripción, urgencia, contacto) -- la
// categoría y la localidad ya vienen resueltas desde el mapa (búsqueda
// actual / geolocalización), así que acá son solo ajustables, no exigidas
// de nuevo.
@Component({
  selector: 'app-quick-need-form',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, LocalityAutocompleteComponent],
  templateUrl: './quick-need-form.component.html',
  styleUrl: './quick-need-form.component.scss',
})
export class QuickNeedFormComponent implements OnInit {
  @Input() categories: Category[] = [];
  @Input() defaultCategoryId: number | null = null;
  @Input() defaultLocality: string | null = null;
  @Input() latitude!: number;
  @Input() longitude!: number;

  @Output() closed = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly publicationsService = inject(PublicationsService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly success = signal(false);
  readonly submittedLocality = signal<string | null>(null);

  // Se arma en ngOnInit, no como inicializador de campo: los @Input()
  // todavía no llegaron cuando corre el constructor, así que
  // defaultCategoryId/defaultLocality serían siempre su valor por
  // default acá.
  form!: ReturnType<typeof this.buildForm>;

  ngOnInit(): void {
    this.form = this.buildForm();
  }

  private buildForm() {
    return this.fb.nonNullable.group({
      categoryId: [this.defaultCategoryId ?? 0, [Validators.required, Validators.min(1)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      urgency: ['media' as 'baja' | 'media' | 'alta', [Validators.required]],
      contactInfo: ['', [Validators.required, Validators.maxLength(255)]],
      locality: [this.defaultLocality ?? ''],
    });
  }

  close(): void {
    this.closed.emit();
  }

  onLocalitySelected(selection: LocalitySelection): void {
    this.form.patchValue({ locality: selection.locality });
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
      .createPrivateNeed({
        categoryId: raw.categoryId,
        description: raw.description,
        urgency: raw.urgency,
        contactInfo: raw.contactInfo,
        latitude: this.latitude,
        longitude: this.longitude,
        locality: raw.locality || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.submittedLocality.set(raw.locality || null);
          this.success.set(true);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            error.status === 401
              ? 'Necesitás iniciar sesión para publicar tu necesidad.'
              : 'No se pudo registrar tu necesidad. Intentá de nuevo.',
          );
        },
      });
  }
}
