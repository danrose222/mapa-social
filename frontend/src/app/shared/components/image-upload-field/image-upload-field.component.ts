import { Component, EventEmitter, Output, inject, signal } from '@angular/core';

import { UploadsService } from '../../../core/services/uploads.service';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Component({
  selector: 'app-image-upload-field',
  standalone: true,
  templateUrl: './image-upload-field.component.html',
  styleUrl: './image-upload-field.component.scss',
})
export class ImageUploadFieldComponent {
  private readonly uploadsService = inject(UploadsService);

  @Output() readonly urlChange = new EventEmitter<string | null>();

  readonly previewUrl = signal<string | null>(null);
  readonly isUploading = signal(false);
  readonly errorMessage = signal('');

  // La url que YA está confirmada en el servidor (distinto de previewUrl,
  // que puede ser un blob: local mientras todavía está subiendo). La
  // necesitamos para poder borrar el archivo viejo del servidor si el
  // usuario elige otra foto o la quita antes de mandar el formulario.
  private uploadedServerUrl: string | null = null;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      this.errorMessage.set('Formato no soportado. Usá JPG, PNG, WEBP o GIF.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.errorMessage.set('La imagen pesa más de 5MB.');
      return;
    }

    // Si ya había una imagen subida (el usuario cambió de idea), la
    // borramos del servidor antes de subir la nueva -- si no, queda
    // huérfana ahí para siempre.
    this.discardServerUpload();

    this.errorMessage.set('');
    this.isUploading.set(true);

    const localPreview = URL.createObjectURL(file);
    this.previewUrl.set(localPreview);

    this.uploadsService.uploadImage(file).subscribe({
      next: (response) => {
        this.isUploading.set(false);
        this.uploadedServerUrl = response.url;
        this.urlChange.emit(response.url);
      },
      error: () => {
        this.isUploading.set(false);
        this.errorMessage.set('No se pudo subir la imagen. Probá de nuevo.');
        this.previewUrl.set(null);
        this.urlChange.emit(null);
      },
    });
  }

  removeImage(): void {
    this.discardServerUpload();
    this.previewUrl.set(null);
    this.errorMessage.set('');
    this.urlChange.emit(null);
  }

  private discardServerUpload(): void {
    if (!this.uploadedServerUrl) {
      return;
    }

    this.uploadsService.deleteImage(this.uploadedServerUrl).subscribe({ error: () => {} });
    this.uploadedServerUrl = null;
  }
}
