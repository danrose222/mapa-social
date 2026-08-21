import { Component, ViewChild, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CategoriesService } from '../../core/services/categories.service';
import { PublicationsService } from '../../core/services/publications.service';
import { UploadsService } from '../../core/services/uploads.service';
import { GeorefService } from '../../core/services/georef.service';
import { Category } from '../../core/models/mapa-social.model';
import { LocationPickerComponent } from '../../shared/components/location-picker/location-picker.component';
import { ImageUploadFieldComponent } from '../../shared/components/image-upload-field/image-upload-field.component';
import {
  LocalityAutocompleteComponent,
  LocalitySelection,
} from '../../shared/components/locality-autocomplete/locality-autocomplete.component';

@Component({
  selector: 'app-necesito-ayuda',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LocationPickerComponent,
    ImageUploadFieldComponent,
    LocalityAutocompleteComponent,
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
    this.form.patchValue({ latitude: location.lat, longitude: location.lng });
    this.locationConfirmed.set(true);
  }

  onLocalitySelected(selection: LocalitySelection): void {
    this.form.patchValue({ locality: selection.locality });

    // Mueve el pin a la localidad elegida para que quien publica no tenga
    // que además ir a tocar el mapa a mano -- decir "Villa Carlos Paz" ya
    // alcanza para que la necesidad quede geolocalizada ahí, no en el
    // centro de Córdoba capital que trae el form por default.
    this.georefService.geocodeLocality(selection.locality).subscribe({
      next: (point) => {
        if (point) {
          this.locationPicker.moveTo(point.lat, point.lng);
        }
      },
      error: () => {},
    });
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
