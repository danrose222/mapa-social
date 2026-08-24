import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { roundCoordinate } from '../../shared/utils/coordinates.util';

export interface GeorefLocality {
  nombre: string;
  provincia: { nombre: string };
}

interface GeorefLocalidadesResponse {
  localidades: GeorefLocality[];
}

interface GeorefCentroideResponse {
  localidades: {
    nombre: string;
    provincia?: { nombre: string };
    centroide: { lat: number; lon: number };
  }[];
}

interface GeorefDireccionesResponse {
  direcciones: { nomenclatura: string; ubicacion: { lat: number; lon: number } }[];
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeorefAddressMatch extends GeoPoint {
  label: string;
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
      campos: 'nombre,provincia,centroide',
      max: '15',
    });

    return this.http
      .get<GeorefCentroideResponse>(`${GEOREF_BASE_URL}/localidades?${params.toString()}`)
      .pipe(
        map((response) => {
          const localidades = response.localidades;

          if (localidades.length === 0) {
            return null;
          }

          // Mismo criterio que locality-autocomplete.component.ts: nombres
          // de localidad se repiten entre provincias (ej: "La Falda" existe
          // en Córdoba y en San Juan) y GeoRef no las ordena por relevancia
          // local -- sin esto, pedir max:1 podía devolver la de otra
          // provincia y centrar el mapa a cientos de km de donde
          // corresponde. Esta app es de alcance provincial, así que ante
          // ambigüedad preferimos la de Córdoba -- y si NINGÚN resultado es
          // de Córdoba (ej: "Alberdi" solo existe como localidad en Buenos
          // Aires, aunque acá se use como nombre de barrio dentro de la
          // capital cordobesa), es más seguro no matchear que centrar el
          // mapa a cientos de km en la provincia equivocada.
          const match = localidades.find((l) => l.provincia?.nombre === 'Córdoba');

          if (!match) {
            return null;
          }

          return {
            lat: roundCoordinate(match.centroide.lat),
            lng: roundCoordinate(match.centroide.lon),
          };
        }),
        catchError(() => of(null)),
      );
  }

  // Busca coincidencias de una direccion puntual (calle + altura) para
  // mostrar como opciones -- no adivina una sola "mejor" (ver por qué en
  // el comentario de abajo). Sin el filtro de localidad, /direcciones
  // busca la calle en todo el pais y devuelve cualquier homonima (ej:
  // "Av. Colon 1200" matchea Bahia Blanca antes que Cordoba) -- por eso
  // `locality` es la que ancla el resultado a la ciudad correcta, no un
  // dato opcional decorativo.
  searchAddresses(address: string, locality: string): Observable<GeorefAddressMatch[]> {
    const term = address.trim();

    if (term.length < 4 || !locality.trim()) {
      return of([]);
    }

    return this.queryAddresses(term, locality).pipe(
      switchMap((matches) => {
        if (matches.length > 0) {
          return of(matches);
        }

        // Muchas localidades chicas tienen la calle cargada en el padrón
        // pero no el rango de alturas (ej: "Sarmiento" existe en La
        // Falda, pero "Sarmiento 850" no matchea nada porque esa altura
        // nunca se digitalizó) -- sin este reintento, esas direcciones
        // no muestran ninguna sugerencia aunque la calle sea real.
        // Reintentamos solo con el nombre de la calle para al menos
        // ubicar el pin sobre ella, en vez de dejar el campo sin nada.
        // El sufijo opcional cubre remates comunes en direcciones
        // argentinas ("850 bis", "1200 piso 2", "300 dpto 4") que de
        // otro modo dejan `streetOnly === term` y matan el reintento.
        const streetOnly = term
          .replace(/\d+\s*(?:bis|ter|piso\s*\S*|dpto\.?\s*\S*|depto\.?\s*\S*)?\s*$/i, '')
          .trim();

        if (!streetOnly || streetOnly === term) {
          return of([]);
        }

        return this.queryAddresses(streetOnly, locality);
      }),
    );
  }

  private queryAddresses(direccion: string, locality: string): Observable<GeorefAddressMatch[]> {
    const params = new URLSearchParams({
      direccion,
      localidad_censal: locality.trim(),
      campos: 'nomenclatura,ubicacion',
      max: '5',
    });

    return this.http
      .get<GeorefDireccionesResponse>(`${GEOREF_BASE_URL}/direcciones?${params.toString()}`)
      .pipe(
        map((response) => {
          const seen = new Set<string>();
          const matches: GeorefAddressMatch[] = [];

          for (const d of response.direcciones) {
            if (seen.has(d.nomenclatura)) {
              continue;
            }

            seen.add(d.nomenclatura);
            matches.push({
              label: d.nomenclatura,
              lat: roundCoordinate(d.ubicacion.lat),
              lng: roundCoordinate(d.ubicacion.lon),
            });
          }

          return matches;
        }),
        catchError(() => of([])),
      );
  }
}
