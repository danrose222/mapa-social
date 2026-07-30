import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CreateNeedPayload,
  CreateResourcePayload,
} from '../models/publication.model';

@Injectable({
  providedIn: 'root',
})
export class PublicationsApiService {
  private readonly needsUrl = '/api/needs';
  private readonly resourcesUrl = '/api/resources';

  constructor(private readonly http: HttpClient) {}

  createNeed(
    payload: CreateNeedPayload,
  ): Observable<unknown> {
    return this.http.post(this.needsUrl, payload);
  }

  createResource(
    payload: CreateResourcePayload,
  ): Observable<unknown> {
    return this.http.post(this.resourcesUrl, payload);
  }
}
