import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface UploadImageResponse {
  url: string;
}

@Injectable({ providedIn: 'root' })
export class UploadsService {
  private readonly uploadUrl = '/api/uploads/image';

  constructor(private readonly http: HttpClient) {}

  uploadImage(file: File): Observable<UploadImageResponse> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<UploadImageResponse>(this.uploadUrl, formData);
  }

  // Borra una imagen que se subió pero nunca terminó de usarse (ej: la
  // publicación falló después de subir la foto). Idempotente del lado del
  // backend -- llamarlo dos veces con la misma url no rompe nada.
  deleteImage(url: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(this.uploadUrl, { body: { url } });
  }
}
