import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';

export interface GeorefLocality {
  nombre: string;
  provincia: { nombre: string };
}

interface GeorefLocalidadesResponse {
  localidades: GeorefLocality[];
}

// API pública del gobierno argentino para normalizar nombres de
// localidades. Gratuita, sin autenticación. No guardamos ningún padrón
// propio: consultamos en vivo cada vez que alguien busca.
// Docs: https://www.argentina.gob.ar/georef
const GEOREF_BASE_URL = 'https://apis.datos.gob.ar/georef/api';

@Injectable({ providedIn: 'root' })
export class GeorefService {
  constructor(private readonly http: HttpClient) {}

  searchLocalities(query: string): Observable<GeorefLocality[]> {
    const term = query.trim();

    if (term.length < 3) {
      return of([]);
    }

    const params = new URLSearchParams({
      nombre: term,
      campos: 'nombre,provincia',
      max: '10',
    });

    return this.http
      .get<GeorefLocalidadesResponse>(`${GEOREF_BASE_URL}/localidades?${params.toString()}`)
      .pipe(map((response) => response.localidades));
  }
}
