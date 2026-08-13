import { Component, DestroyRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  of,
  switchMap,
} from 'rxjs';

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

const CATEGORIA_SALUD_ID = 1;

interface ResultadoNominatim {
  lat: string;
  lon: string;
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
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(LocationPickerComponent)
  private readonly locationPicker?: LocationPickerComponent;

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

  // Estado de la ubicacion automatica en el mapa: se busca sola a partir de
  // lo que se escribe en "Ubicación" (mismo patrón que "Registrar
  // organización" y "Ofrecer un recurso"). El mapa queda para ajustar el
  // pin a mano si la busqueda automatica no encontro el punto exacto.
  readonly buscandoUbicacion = signal(false);
  readonly ubicacionEncontrada = signal(false);
  readonly ubicacionSinResultado = signal(false);

  // Orientación contextual cuando la necesidad es de categoría Salud: no es
  // un chat con un modelo (nada de esto se manda a ningún backend de IA),
  // es contenido fijo que evita afirmar como universal cosas que varían
  // según la organización o el municipio (qué documentación piden, con qué
  // banco de medicamentos articulan, etc.) — ver el intercambio con Dani
  // sobre por qué el texto original venía con demasiado detalle específico
  // sin poder verificarlo.
  readonly categoriaSaludSeleccionada = signal(false);

  constructor() {
    this.form.controls.categoryId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((categoryId) => {
        this.categoriaSaludSeleccionada.set(categoryId === CATEGORIA_SALUD_ID);
      });

    this.form.controls.address.valueChanges
      .pipe(
        debounceTime(800),
        distinctUntilChanged(),
        filter((direccion) => direccion.trim().length > 5),
        switchMap((direccion) => this.geocodificar(direccion)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        this.buscandoUbicacion.set(false);

        if (!resultado) {
          this.ubicacionSinResultado.set(true);
          this.ubicacionEncontrada.set(false);
          return;
        }

        this.ubicacionSinResultado.set(false);
        this.ubicacionEncontrada.set(true);
        this.locationPicker?.centrarEn(resultado.lat, resultado.lng);
      });
  }

  private geocodificar(direccion: string) {
    this.buscandoUbicacion.set(true);
    this.ubicacionSinResultado.set(false);

    return this.http
      .get<ResultadoNominatim[]>(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            format: 'json',
            q: `${direccion}, Argentina`,
            limit: '1',
            countrycodes: 'ar',
          },
        },
      )
      .pipe(
        map((resultados) =>
          resultados.length
            ? {
                lat: Number(resultados[0].lat),
                lng: Number(resultados[0].lon),
              }
            : null,
        ),
        catchError(() => of(null)),
      );
  }

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
            'Solo una comunidad u ONG puede registrar una necesidad. Si necesitás ayuda, pedila desde el mapa con "Solicitar ayuda".',
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