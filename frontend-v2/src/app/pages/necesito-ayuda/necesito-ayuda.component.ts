import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CategoriesService } from '../../core/services/categories.service';
import { PublicationsService } from '../../core/services/publications.service';
import { UploadsService } from '../../core/services/uploads.service';
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
  private readonly router = inject(Router);

  readonly categories = signal<Category[]>([]);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly submitted = signal(false);
  readonly imageUrl = signal<string | null>(null);

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
    this.router.navigateByUrl('/');
  }
}
