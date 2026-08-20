import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

export interface GeorefLocality {
  nombre: string;
  provincia: { nombre: string };
}

interface GeorefLocalidadesResponse {
  localidades: GeorefLocality[];
}

interface GeorefCentroideResponse {
  localidades: { nombre: string; centroide: { lat: number; lon: number } }[];
}

export interface GeoPoint {
  lat: number;
  lng: number;
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

  // Convierte un nombre de localidad (ej: la 'ciudad' guardada en el
  // perfil de un vecino) en coordenadas -- para poder centrar el mapa y
  // usarla como punto de búsqueda por radio, igual que la geolocalización
  // del navegador. Devuelve null si no la encuentra, en vez de romper.
  geocodeLocality(name: string): Observable<GeoPoint | null> {
    const term = name.trim();

    if (!term) {
      return of(null);
    }

    const params = new URLSearchParams({
      nombre: term,
      campos: 'nombre,centroide',
      max: '1',
    });

    return this.http
      .get<GeorefCentroideResponse>(`${GEOREF_BASE_URL}/localidades?${params.toString()}`)
      .pipe(
        map((response) => {
          const first = response.localidades[0];
          return first ? { lat: first.centroide.lat, lng: first.centroide.lon } : null;
        }),
        catchError(() => of(null)),
      );
  }
}
