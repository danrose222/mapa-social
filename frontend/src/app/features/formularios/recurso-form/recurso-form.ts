import { Component, inject } from '@angular/core';
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
  selector: 'app-recurso-form',
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
  templateUrl: './recurso-form.html',
  styleUrl: './recurso-form.scss',
})
export class RecursoForm {
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
    organizationName: [
      '',
      [
        Validators.required,
        Validators.maxLength(150),
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
    schedule: [
      '',
      [
        Validators.required,
        Validators.maxLength(150),
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

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  hasLocation = false;

  onLocationSelected(coords: { lat: number; lng: number }): void {
    this.form.patchValue({
      latitude: coords.lat,
      longitude: coords.lng,
    });
    this.hasLocation = true;
  }

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage =
        'Revisá los campos obligatorios antes de continuar.';
      return;
    }

    if (!this.hasLocation) {
      this.errorMessage =
        'Seleccioná una ubicación en el mapa antes de continuar.';
      return;
    }

    const payload = this.form.getRawValue();

    this.isSubmitting = true;

    this.publicationsApi.createResource(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage =
          'El recurso se publicó correctamente.';

        localStorage.removeItem('resource_draft');
      },
      error: (error) => {
        this.isSubmitting = false;

        if (error.status === 401) {
          this.errorMessage =
            'Necesitás iniciar sesión para publicar un recurso.';
          return;
        }

        if (error.status === 403) {
          this.errorMessage =
            'No tenés permisos para publicar un recurso.';
          return;
        }

        if (error.status === 400) {
          this.errorMessage =
            'La API rechazó los datos enviados. El backend todavía debe aceptar los campos del formulario.';
          return;
        }

        this.errorMessage =
          'No se pudo publicar el recurso. Intentá nuevamente.';
      },
    });
  }

  saveDraft(): void {
    localStorage.setItem(
      'resource_draft',
      JSON.stringify(this.form.getRawValue()),
    );

    this.errorMessage = '';
    this.successMessage =
      'El borrador se guardó correctamente en este dispositivo.';
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