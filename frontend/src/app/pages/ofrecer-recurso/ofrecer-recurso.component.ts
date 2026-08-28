import { Component, ViewChild, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CategoriesService } from '../../core/services/categories.service';
import { PublicationsService } from '../../core/services/publications.service';
import { AuthService } from '../../core/services/auth.service';
import { OrganizationsService } from '../../core/services/organizations.service';
import { UploadsService } from '../../core/services/uploads.service';
import { GeorefAddressMatch, GeorefService } from '../../core/services/georef.service';
import { Category } from '../../core/models/mapa-social.model';
import { LocationPickerComponent } from '../../shared/components/location-picker/location-picker.component';
import { ImageUploadFieldComponent } from '../../shared/components/image-upload-field/image-upload-field.component';
import { AddressAutocompleteComponent } from '../../shared/components/address-autocomplete/address-autocomplete.component';

@Component({
  selector: 'app-ofrecer-recurso',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LocationPickerComponent,
    ImageUploadFieldComponent,
    AddressAutocompleteComponent,
  ],
  templateUrl: './ofrecer-recurso.component.html',
  styleUrl: './ofrecer-recurso.component.scss',
})
export class OfrecerRecursoComponent {
  private readonly fb = inject(FormBuilder);
  private readonly categoriesService = inject(CategoriesService);
  private readonly publicationsService = inject(PublicationsService);
  private readonly authService = inject(AuthService);
  private readonly organizationsService = inject(OrganizationsService);
  private readonly uploadsService = inject(UploadsService);
  private readonly georefService = inject(GeorefService);
  private readonly router = inject(Router);

  @ViewChild(LocationPickerComponent) private locationPicker!: LocationPickerComponent;

  // La fuente de verdad de "puede publicar" vive en AuthService (GET
  // /users/me en vivo) -- acá solo la leemos para decidir qué mostrar.
  readonly profileLoaded = this.authService.profileLoaded;
  readonly canPublish = this.authService.canPublishResource;
  readonly publishReason = this.authService.resourcePublishReason;

  readonly categories = signal<Category[]>([]);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly forbidden = signal(false);
  readonly submitted = signal(false);
  readonly imageUrl = signal<string | null>(null);

  // Sin esto, publicar sin tocar el mapa guardaba el recurso en el
  // default del form (Córdoba capital) en vez de donde está la organización.
  private readonly locationConfirmed = signal(false);

  // La localidad de la organización ya se sabe (no hace falta pedírsela
  // de nuevo acá) -- se usa para centrar el mapa apenas carga la página y
  // para acotar la búsqueda de app-address-autocomplete a esa ciudad.
  readonly organizationCiudad = signal('');

  // Igual que en necesito-ayuda.component.ts: identifica cuál fue la
  // última acción que fijó la ubicación (geocodificado automático de la
  // ciudad, dirección confirmada, o click manual), para que una respuesta
  // asíncrona vieja no pise en silencio algo más nuevo.
  private locationActionId = 0;

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    categoryId: [null as number | null, [Validators.required]],
    description: ['', [Validators.required]],
    schedule: [''],
    address: [''],
    contactName: [''],
    contactInfo: [''],
    latitude: [-31.4201, [Validators.required]],
    longitude: [-64.1888, [Validators.required]],
  });

  constructor() {
    this.authService.refreshProfile().subscribe((profile) => {
      const organizationId = profile?.organization?.id;

      if (!organizationId) {
        return;
      }

      this.organizationsService.getOne(organizationId).subscribe({
        next: (org) => {
          this.organizationCiudad.set(org.ciudad);
          this.geocodeOrganizationCiudad(org.ciudad);
        },
        error: () => {},
      });
    });

    this.categoriesService.getAll().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => {},
    });
  }

  // Centra el mapa en la ciudad de la organización apenas se conoce, para
  // que publicar no arranque siempre en Córdoba capital -- clickear el
  // mapa queda reservado para afinar el punto exacto, no para ubicarse.
  private geocodeOrganizationCiudad(ciudad: string): void {
    const actionId = ++this.locationActionId;

    this.georefService.geocodeLocality(ciudad).subscribe({
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

  // A diferencia del geocodificado automático de la ciudad, confirmar una
  // dirección es una acción explícita del usuario -- puede mover el pin
  // igual, incluso después de un click manual previo.
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
    // todavía estaba en vuelo.
    if (!this.locationPicker) {
      return;
    }

    this.locationPicker.moveTo(point.lat, point.lng);
    this.form.patchValue({ latitude: point.lat, longitude: point.lng });
    this.locationConfirmed.set(true);
    this.errorMessage.set('');
  }

  onLocationSelected(location: { lat: number; lng: number }): void {
    this.locationActionId++;
    this.form.patchValue({ latitude: location.lat, longitude: location.lng });
    this.locationConfirmed.set(true);
    this.errorMessage.set('');
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.locationConfirmed()) {
      this.errorMessage.set('Marcá la ubicación del recurso en el mapa antes de publicar.');
      return;
    }

    const raw = this.form.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.forbidden.set(false);

    this.publicationsService
      .createResource({
        title: raw.title!,
        description: raw.description!,
        categoryId: raw.categoryId!,
        latitude: raw.latitude!,
        longitude: raw.longitude!,
        address: raw.address || undefined,
        schedule: raw.schedule || undefined,
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

          if (error.status === 403) {
            this.forbidden.set(true);
            return;
          }

          this.errorMessage.set(
            error.status === 401
              ? 'Tu sesión expiró. Iniciá sesión de nuevo.'
              : 'No se pudo publicar el recurso. Intentá de nuevo más tarde.',
          );
        },
      });
  }

  // Si se había subido una imagen y la publicación falla por cualquier
  // motivo, el archivo queda huérfano en el servidor -- lo borramos.
  // Fire-and-forget: si el borrado en sí falla, no bloqueamos al usuario
  // por eso (el error ya se le está mostrando por otra vía).
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
