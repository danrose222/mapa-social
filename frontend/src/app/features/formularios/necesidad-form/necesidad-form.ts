import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import {
  PublicationsApiService,
} from '../../../core/services/publications-api.service';
import {
  LocationPickerComponent,
} from '../../../shared/components/location-picker/location-picker.component';

interface Categoria {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-necesidad-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LocationPickerComponent,
  ],
  templateUrl: './necesidad-form.html',
  styleUrl: './necesidad-form.scss',
})
export class NecesidadForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly publicationsApi = inject(PublicationsApiService);

  readonly categorias: Categoria[] = [
    { id: 1, nombre: 'Salud' },
    { id: 2, nombre: 'Educación' },
    { id: 3, nombre: 'Alimentos' },
    { id: 4, nombre: 'Empleo' },
    { id: 5, nombre: 'Vivienda' },
    { id: 6, nombre: 'Asistencia comunitaria' },
  ];

  readonly form = this.formBuilder.nonNullable.group({
    title: [
      '',
      [
        Validators.required,
        Validators.maxLength(255),
      ],
    ],
    categoryId: [
      0,
      [
        Validators.required,
        Validators.min(1),
      ],
    ],
    locality: [
      '',
      [
        Validators.required,
        Validators.maxLength(120),
      ],
    ],
    description: [
      '',
      [
        Validators.required,
        Validators.minLength(10),
      ],
    ],
    address: [
      '',
      [
        Validators.required,
        Validators.maxLength(255),
      ],
    ],
    contactName: [
      '',
      [
        Validators.required,
        Validators.maxLength(120),
      ],
    ],
    contactInfo: [
      '',
      [
        Validators.required,
        Validators.maxLength(150),
      ],
    ],
    latitude: [0],
    longitude: [0],
  });

  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  hasLocation = false;

  onLocationSelected(coords: { lat: number; lng: number }): void {
    this.form.patchValue({
      latitude: coords.lat,
      longitude: coords.lng,
    });
    this.hasLocation = true;
  }

  onSubmit(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set(
        'Revisá los campos obligatorios antes de continuar.',
      );
      return;
    }

    if (!this.hasLocation) {
      this.errorMessage.set(
        'Seleccioná una ubicación en el mapa antes de continuar.',
      );
      return;
    }

    const payload = this.form.getRawValue();

    this.isSubmitting.set(true);

    this.publicationsApi.createNeed(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('La necesidad se registró correctamente.');

        localStorage.removeItem('need_draft');

        this.form.reset({
          title: '',
          categoryId: 0,
          locality: '',
          description: '',
          address: '',
          contactName: '',
          contactInfo: '',
          latitude: 0,
          longitude: 0,
        });
        this.hasLocation = false;
      },
      error: (error) => {
        this.isSubmitting.set(false);

        if (error.status === 401) {
          this.errorMessage.set(
            'Necesitás iniciar sesión para registrar una necesidad.',
          );
          return;
        }

        if (error.status === 403) {
          this.errorMessage.set(
            'No tenés permisos para registrar una necesidad.',
          );
          return;
        }

        if (error.status === 400) {
          this.errorMessage.set(
            'La API rechazó los datos enviados. El backend todavía debe aceptar los campos del formulario.',
          );
          return;
        }

        this.errorMessage.set(
          'No se pudo registrar la necesidad. Intentá nuevamente.',
        );
      },
    });
  }

  saveDraft(): void {
    localStorage.setItem(
      'need_draft',
      JSON.stringify(this.form.getRawValue()),
    );

    this.errorMessage.set('');
    this.successMessage.set(
      'El borrador se guardó correctamente en este dispositivo.',
    );
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);

    return Boolean(
      control &&
      control.invalid &&
      (control.touched || control.dirty),
    );
  }
}
