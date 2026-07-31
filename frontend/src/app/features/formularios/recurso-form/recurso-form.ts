import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { LocationPickerComponent } from '../../../shared/components/location-picker/location-picker.component';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { ResourcesService } from '../../../core/services/resources.service';

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
export class RecursoForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categoriesService = inject(CategoriesService);
  private readonly resourcesService = inject(ResourcesService);
  private readonly router = inject(Router);

  readonly categorias = signal<Category[]>([]);

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    categoryId: [null as number | null, Validators.required],
    description: ['', Validators.required],
    latitude: [null as number | null, Validators.required],
    longitude: [null as number | null, Validators.required],
  });

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  readonly hasLocation = computed(
    () =>
      this.form.controls.latitude.value !== null &&
      this.form.controls.longitude.value !== null,
  );

  ngOnInit(): void {
    this.categoriesService.getAll().subscribe({
      next: (categorias) => this.categorias.set(categorias),
      error: () => this.categorias.set([]),
    });
  }

  onPositionChange(position: { lat: number; lng: number }): void {
    this.form.patchValue({
      latitude: position.lat,
      longitude: position.lng,
    });
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, description, categoryId, latitude, longitude } =
      this.form.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.resourcesService
      .create({
        title: title!,
        description: description!,
        categoryId: categoryId!,
        latitude: latitude!,
        longitude: longitude!,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigateByUrl('/mapa');
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            error.status === 401
              ? 'Tu sesión expiró, iniciá sesión de nuevo.'
              : 'No se pudo publicar el recurso. Intentá de nuevo más tarde.',
          );
        },
      });
  }
}
