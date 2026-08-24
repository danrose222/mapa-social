import { Component, ViewChild, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CategoriesService } from '../../core/services/categories.service';
import { PublicationsService } from '../../core/services/publications.service';
import { UploadsService } from '../../core/services/uploads.service';
import { GeorefAddressMatch, GeorefService } from '../../core/services/georef.service';
import { Category } from '../../core/models/mapa-social.model';
import { LocationPickerComponent } from '../../shared/components/location-picker/location-picker.component';
import { ImageUploadFieldComponent } from '../../shared/components/image-upload-field/image-upload-field.component';
import {
  LocalityAutocompleteComponent,
  LocalitySelection,
} from '../../shared/components/locality-autocomplete/locality-autocomplete.component';
import { AddressAutocompleteComponent } from '../../shared/components/address-autocomplete/address-autocomplete.component';

@Component({
  selector: 'app-necesito-ayuda',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LocationPickerComponent,
    ImageUploadFieldComponent,
    LocalityAutocompleteComponent,
    AddressAutocompleteComponent,
  ],
  templateUrl: './necesito-ayuda.component.html',
  styleUrl: './necesito-ayuda.component.scss',
})
export class NecesitoAyudaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly categoriesService = inject(CategoriesService);
  private readonly publicationsService = inject(PublicationsService);
  private readonly uploadsService = inject(UploadsService);
  private readonly georefService = inject(GeorefService);
  private readonly router = inject(Router);

  @ViewChild(LocationPickerComponent) private locationPicker!: LocationPickerComponent;

  readonly categories = signal<Category[]>([]);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly submitted = signal(false);
  readonly imageUrl = signal<string | null>(null);

  // El form arranca con lat/lng "válidas" (Córdoba capital) solo para que
  // el FormControl tenga un valor -- pero eso NO significa que reflejen
  // dónde está el vecino. Sin esta bandera, publicar sin tocar el mapa
  // guardaba la necesidad en Córdoba capital aunque el vecino hubiera
  // escrito su localidad o dirección real en los campos de texto.
  private readonly locationConfirmed = signal(false);

  // El autocomplete de dirección necesita saber la localidad ya
  // confirmada para poder buscar (ver GeorefService.searchAddresses).
  readonly confirmedLocality = signal('');

  // Identifica cuál fue la última acción que fijó la ubicación (click en
  // el mapa, localidad u dirección confirmada). Un geocodificado
  // asíncrono (el de localidad) sólo se aplica si nada más definió la
  // ubicación mientras estaba en vuelo -- sin esto, una respuesta lenta
  // podía pisar en silencio un click manual o una dirección más precisa
  // confirmada después.
  private locationActionId = 0;

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    categoryId: [null as number | null, [Validators.required]],
    description: ['', [Validators.required]],
    locality: [''],
    address: [''],
    contactName: [''],
    contactInfo: [''],
    latitude: [-31.4201, [Validators.required]],
    longitude: [-64.1888, [Validators.required]],
  });

  constructor() {
    this.categoriesService.getAll().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => {},
    });
  }

  onLocationSelected(location: { lat: number; lng: number }): void {
    this.locationActionId++;
    this.form.patchValue({ latitude: location.lat, longitude: location.lng });
    this.locationConfirmed.set(true);
    this.errorMessage.set('');
  }

  onLocalitySelected(selection: LocalitySelection): void {
    this.form.patchValue({ locality: selection.locality });
    this.confirmedLocality.set(selection.locality);

    // Mueve el pin a la localidad elegida para que quien publica no tenga
    // que además ir a tocar el mapa a mano -- decir "Villa Carlos Paz" ya
    // alcanza para que la necesidad quede geolocalizada ahí, no en el
    // centro de Córdoba capital que trae el form por default. Reserva un
    // id ANTES de la llamada asíncrona: si otra acción (click manual,
    // dirección confirmada, u otra localidad) cambia locationActionId
    // mientras esta respuesta está en vuelo, se descarta en vez de pisar
    // algo más nuevo.
    const actionId = ++this.locationActionId;

    this.georefService.geocodeLocality(selection.locality).subscribe({
      next: (point) => {
        if (point) {
          this.applyGeocodedPoint(point, actionId);
        }
      },
      error: () => {},
    });
  }

  onAddressTextChanged(text: string): void {
    this.form.patchValue({ address: text });
  }

  // A diferencia del geocodificado de localidad (que corre en segundo
  // plano apenas se elige una), confirmar una dirección acá sólo pasa
  // por una acción explícita del usuario (click, Enter, o blur con una
  // sola coincidencia) -- es una señal de intención tan deliberada como
  // tocar el mapa, así que debe poder mover el pin igual, incluso
  // después de un click manual previo (ej: si corrige un typo en la
  // dirección después de haber afinado el punto a mano).
  onAddressSelected(match: GeorefAddressMatch): void {
    this.locationActionId++;
    this.applyGeocodedPoint(match);
  }

  private applyGeocodedPoint(point: { lat: number; lng: number }, actionId?: number): void {
    if (actionId !== undefined && actionId !== this.locationActionId) {
      return;
    }

    // El ViewChild queda `undefined` si el usuario ya publicó (el @if
    // saca <app-location-picker> del árbol) mientras esta respuesta
    // todavía estaba en vuelo -- no hay nada que mover en ese caso.
    if (!this.locationPicker) {
      return;
    }

    this.locationPicker.moveTo(point.lat, point.lng);
    this.form.patchValue({ latitude: point.lat, longitude: point.lng });
    this.locationConfirmed.set(true);
    this.errorMessage.set('');
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.locationConfirmed()) {
      this.errorMessage.set(
        'Marcá tu ubicación en el mapa o elegí tu localidad antes de publicar.',
      );
      return;
    }

    const raw = this.form.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.publicationsService
      .createNeed({
        title: raw.title!,
        description: raw.description!,
        categoryId: raw.categoryId!,
        latitude: raw.latitude!,
        longitude: raw.longitude!,
        address: raw.address || undefined,
        locality: raw.locality || undefined,
        contactName: raw.contactName || undefined,
        contactInfo: raw.contactInfo || undefined,
        imageUrl: this.imageUrl() ?? undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.submitted.set(true);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.discardUploadedImageIfAny();
          this.errorMessage.set(
            error.status === 401
              ? 'Tu sesión expiró. Iniciá sesión de nuevo.'
              : error.status === 403
                ? (error.error?.message ?? 'No podés publicar en este momento.')
                : 'No se pudo publicar la necesidad. Intentá de nuevo más tarde.',
          );
        },
      });
  }

  private discardUploadedImageIfAny(): void {
    const url = this.imageUrl();

    if (!url) {
      return;
    }

    this.uploadsService.deleteImage(url).subscribe({ error: () => {} });
    this.imageUrl.set(null);
  }

  volverAlMapa(): void {
    this.router.navigateByUrl('/mapa');
  }
}
