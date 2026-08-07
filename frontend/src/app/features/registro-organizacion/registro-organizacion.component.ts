import {
  Component,
  DestroyRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

import {
  LocationPickerComponent,
} from '../../shared/components/location-picker/location-picker.component';
import { AuthService } from '../../core/services/auth.service';

type TipoOrganizacion = 'comunidad' | 'ong' | 'moderador';

interface Categoria {
  id: number;
  nombre: string;
}

interface ResultadoNominatim {
  lat: string;
  lon: string;
}

const ROLE_ID_POR_TIPO: Record<TipoOrganizacion, number> = {
  comunidad: 4,
  ong: 5,
  moderador: 2,
};

@Component({
  selector: 'app-registro-organizacion',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    LocationPickerComponent,
  ],
  templateUrl: './registro-organizacion.component.html',
  styleUrl: './registro-organizacion.component.scss',
})
export class RegistroOrganizacionComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  // Si un moderador completa este formulario, es porque un tercero vino a
  // hacer el tramite en persona en la municipalidad: la organizacion queda
  // aprobada de una, sin pasar por "pendientes de aprobar".
  readonly esRegistroAsistido = this.authService.currentUser()?.role === 'moderador';

  // El login (o cualquier otro link) puede mandar ?tipo= para preseleccionar
  // el tipo de organizacion, por ejemplo desde "¿No tenés cuenta?". No aplica
  // si es registro asistido: ahi el moderador siempre da de alta comunidad/ong.
  private readonly tipoParam = this.route.snapshot.queryParamMap.get('tipo');

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
    tipo: [this.tipoInicial(), [Validators.required]],
    organizationName: [
      '',
      [Validators.required, Validators.maxLength(150)],
    ],
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    phone: ['', [Validators.required, Validators.maxLength(30)]],
    calle: ['', [Validators.required, Validators.maxLength(150)]],
    numero: ['', [Validators.required, Validators.maxLength(20)]],
    ciudad: ['', [Validators.required, Validators.maxLength(100)]],
    codigoPostal: ['', [Validators.required, Validators.maxLength(20)]],
    departamento: ['', [Validators.maxLength(100)]],
    provincia: ['Córdoba', [Validators.required, Validators.maxLength(100)]],
    schedule: ['', [Validators.required, Validators.maxLength(255)]],
    websiteUrl: ['', [Validators.maxLength(255)]],
    latitude: [0],
    longitude: [0],
  });

  private tipoInicial(): TipoOrganizacion {
    if (
      !this.esRegistroAsistido &&
      (this.tipoParam === 'comunidad' ||
        this.tipoParam === 'ong' ||
        this.tipoParam === 'moderador')
    ) {
      return this.tipoParam;
    }

    return 'comunidad';
  }

  // Reactive Forms en vez de un signal + [checked]/(change) manual: con
  // mat-checkbox y change detection zoneless, ese patrón manual perdía
  // clics (el binding [checked] podía pisar el toggle del click anterior
  // antes de que se re-renderizara). formControlName lo maneja solo.
  private readonly categoriasFormValores = Object.fromEntries(
    this.categorias.map((categoria) => [String(categoria.id), false]),
  );

  readonly categoriasForm = this.formBuilder.group(
    this.categoriasFormValores,
  );

  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  // Estado de la ubicacion automatica en el mapa: se busca sola a partir de
  // calle/numero/ciudad/etc. El mapa queda solo para ajustar el pin a mano
  // si la busqueda automatica no encontro el punto exacto.
  readonly buscandoUbicacion = signal(false);
  readonly ubicacionEncontrada = signal(false);
  readonly ubicacionSinResultado = signal(false);
  hasLocation = false;

  constructor() {
    this.form.valueChanges
      .pipe(
        map((valores) => ({
          calle: valores.calle ?? '',
          numero: valores.numero ?? '',
          ciudad: valores.ciudad ?? '',
          codigoPostal: valores.codigoPostal ?? '',
          departamento: valores.departamento ?? '',
          provincia: valores.provincia ?? '',
        })),
        debounceTime(800),
        distinctUntilChanged(
          (previo, actual) => JSON.stringify(previo) === JSON.stringify(actual),
        ),
        filter(
          (direccion) =>
            !!direccion.calle && !!direccion.numero && !!direccion.ciudad,
        ),
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

  private geocodificar(direccion: {
    calle: string;
    numero: string;
    ciudad: string;
    codigoPostal: string;
    departamento: string;
    provincia: string;
  }) {
    const query = [
      `${direccion.calle} ${direccion.numero}`,
      direccion.ciudad,
      direccion.departamento,
      direccion.provincia,
      direccion.codigoPostal,
      'Argentina',
    ]
      .filter(Boolean)
      .join(', ');

    this.buscandoUbicacion.set(true);
    this.ubicacionSinResultado.set(false);

    return this.http
      .get<ResultadoNominatim[]>(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            format: 'json',
            q: query,
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

  tipoSeleccionado(): TipoOrganizacion {
    return this.form.controls.tipo.value;
  }

  onLocationSelected(coords: { lat: number; lng: number }): void {
    this.form.patchValue({
      latitude: coords.lat,
      longitude: coords.lng,
    });
    this.hasLocation = true;
  }

  private categoriasSeleccionadas(): number[] {
    return Object.entries(this.categoriasForm.value)
      .filter(([, marcada]) => marcada)
      .map(([id]) => Number(id));
  }

  private construirDireccionCompleta(): string {
    const { calle, numero, ciudad, codigoPostal, departamento, provincia } =
      this.form.getRawValue();

    return [
      `${calle} ${numero}`,
      ciudad,
      departamento ? `Depto. ${departamento}` : '',
      provincia,
      codigoPostal ? `CP ${codigoPostal}` : '',
    ]
      .filter(Boolean)
      .join(', ');
  }

  submit(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Revisá los campos obligatorios antes de continuar.');
      return;
    }

    if (!this.hasLocation) {
      this.errorMessage.set(
        'No pudimos ubicar la dirección en el mapa automáticamente. Hacé clic en el mapa para marcar el punto exacto.',
      );
      return;
    }

    if (!this.categoriasSeleccionadas().length) {
      this.errorMessage.set(
        'Elegí al menos un tipo de recurso que tu organización ofrece.',
      );
      return;
    }

    const {
      tipo,
      calle,
      numero,
      ciudad,
      codigoPostal,
      departamento,
      provincia,
      ...datosOrganizacion
    } = this.form.getRawValue();

    const payload = {
      ...datosOrganizacion,
      address: this.construirDireccionCompleta(),
      // La jurisdiccion del moderador se define por esta misma ciudad: le
      // permite ver, aprobar y ofrecer recursos a esta organizacion.
      ciudad: ciudad.trim(),
      // Vacío no es lo mismo que "sin dato": el DTO valida que sea una URL
      // si viene, así que si el campo quedó en blanco no se manda la clave
      // (undefined se cae del JSON), en vez de mandar '' y romper la validación.
      websiteUrl: datosOrganizacion.websiteUrl?.trim() || undefined,
      offeredCategoryIds: this.categoriasSeleccionadas(),
      roleId: ROLE_ID_POR_TIPO[tipo],
    };

    this.isSubmitting.set(true);

    const endpoint = this.esRegistroAsistido
      ? '/api/users/registrar-asistida'
      : '/api/users';

    this.http.post(endpoint, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set(
          this.esRegistroAsistido
            ? 'La organización quedó registrada y aprobada.'
            : tipo === 'moderador'
              ? 'Tu municipio quedó registrado. Ya podés iniciar sesión.'
              : 'Tu organización se registró correctamente. Un moderador tiene que aprobarla antes de que puedas publicar recursos.',
        );
        this.form.reset({
          tipo: 'comunidad',
          provincia: 'Córdoba',
          latitude: 0,
          longitude: 0,
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
        this.categoriasForm.reset(this.categoriasFormValores);
        this.hasLocation = false;
        this.ubicacionEncontrada.set(false);
        this.ubicacionSinResultado.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);

        if (error.status === 400) {
          this.errorMessage.set('Revisá los datos ingresados: el correo puede estar duplicado.');
          return;
        }

        this.errorMessage.set('No se pudo completar el registro. Intentá nuevamente.');
      },
    });
  }
}
