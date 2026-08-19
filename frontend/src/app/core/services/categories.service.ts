import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Category } from '../models/mapa-social.model';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly apiUrl = '/api/categories';

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl);
  }
}
