import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Category {
  id: number;
  name: string;
  description?: string;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories');
  }
}
