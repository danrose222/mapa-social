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
  ],
  templateUrl: './recurso-form.html',
  styleUrl: './recurso-form.scss',
})
export class RecursoForm {
  private readonly formBuilder = inject(FormBuilder);

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
    organization: [
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
    location: [
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
  });

  successMessage = '';
  errorMessage = '';

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage =
        'Revisá los campos obligatorios antes de continuar.';
      return;
    }

    console.log('Formulario de recurso válido:', this.form.getRawValue());

    this.successMessage =
      'El formulario es válido y está listo para enviarse a la API.';
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
