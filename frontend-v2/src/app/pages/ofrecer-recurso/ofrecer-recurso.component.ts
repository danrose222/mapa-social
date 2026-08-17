import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CategoriesService } from '../../core/services/categories.service';
import { PublicationsService } from '../../core/services/publications.service';
import { AuthService } from '../../core/services/auth.service';
import { UploadsService } from '../../core/services/uploads.service';
import { Category } from '../../core/models/mapa-social.model';
import { LocationPickerComponent } from '../../shared/components/location-picker/location-picker.component';
import { ImageUploadFieldComponent } from '../../shared/components/image-upload-field/image-upload-field.component';

@Component({
  selector: 'app-ofrecer-recurso',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LocationPickerComponent, ImageUploadFieldComponent],
  templateUrl: './ofrecer-recurso.component.html',
  styleUrl: './ofrecer-recurso.component.scss',
})
export class OfrecerRecursoComponent {
  private readonly fb = inject(FormBuilder);
  private readonly categoriesService = inject(CategoriesService);
  private readonly publicationsService = inject(PublicationsService);
  private readonly authService = inject(AuthService);
  private readonly uploadsService = inject(UploadsService);
  private readonly router = inject(Router);

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
    this.authService.refreshProfile().subscribe();

    this.categoriesService.getAll().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => {},
    });
  }

  onLocationSelected(location: { lat: number; lng: number }): void {
    this.form.patchValue({ latitude: location.lat, longitude: location.lng });
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
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
    this.router.navigateByUrl('/');
  }
}
