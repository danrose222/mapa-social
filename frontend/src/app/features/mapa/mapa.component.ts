import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import * as L from 'leaflet';

interface Necesidad {
  id: number;
  usuario_id: number;
  categoria_id: number;
  titulo: string;
  descripcion: string;
  latitud: number;
  longitud: number;
  estado: string;
  fecha_creacion: string;
}

interface Recurso {
  id: number;
  usuario_id: number;
  categoria_id: number;
  titulo: string;
  descripcion: string;
  latitud: number;
  longitud: number;
  estado: string;
  fecha_creacion: string;
}

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <mat-card class="map-card">
      <mat-card-header>
        <mat-card-title>Mapa Social</mat-card-title>
        <mat-card-subtitle>
          Necesidades comunitarias y recursos disponibles
        </mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <div
          #mapContainer
          class="map-container"
          aria-label="Mapa social interactivo"
        ></div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }

      .map-card {
        width: 100%;
        box-sizing: border-box;
      }

      mat-card-content {
        padding-top: 16px;
      }

      .map-container {
        width: 100%;
        height: 600px;
        min-height: 400px;
        border-radius: 8px;
        overflow: hidden;
      }

      @media (max-width: 768px) {
        :host {
          padding: 12px;
        }

        .map-container {
          height: 70vh;
          min-height: 350px;
        }
      }
    `,
  ],
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  private mapContainer!: ElementRef<HTMLDivElement>;

  private map?: L.Map;

  private readonly needIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  private readonly resourceIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  
  private necesidades: Necesidad[] = [];

  private recursos: Recurso[] = [];

  private agregarMarcador(
    latitud: number,
    longitud: number,
    icon: L.Icon,
    encabezado: string,
    titulo: string,
    descripcion: string,
  ): void {
    const marker = L.marker([latitud, longitud], { icon }).addTo(this.map!);

    marker.bindPopup(`
      <strong>${encabezado}</strong><br>
      <strong>${titulo}</strong><br>
      ${descripcion}
    `);
  }

  ngAfterViewInit(): void {
    this.loadDataFromBackend()
      .catch(() => {})
      .then(() => this.initializeMap());
  }

  private async loadDataFromBackend(): Promise<void> {
    try {
      const [needsRes, resourcesRes] = await Promise.all([
        fetch('/api/needs'),
        fetch('/api/resources'),
      ]);

      if (!needsRes.ok || !resourcesRes.ok) {
        throw new Error(`Error al cargar datos: ${needsRes.status} / ${resourcesRes.status}`);
      }

      const [needsJson, resourcesJson] = await Promise.all([
        needsRes.json(),
        resourcesRes.json(),
      ]);

      this.necesidades = needsJson.map((n: any) => ({
        id: n.id,
        usuario_id: n.userId ?? n.user_id ?? 0,
        categoria_id: n.categoryId ?? n.category_id ?? 0,
        titulo: n.title ?? n.titulo ?? '',
        descripcion: n.description ?? n.descripcion ?? '',
        latitud: Number(n.latitude ?? n.latitud ?? 0),
        longitud: Number(n.longitude ?? n.longitud ?? 0),
        estado: n.status ?? n.estado ?? '',
        fecha_creacion: n.createdAt ?? n.fecha_creacion ?? '',
      }));

      this.recursos = resourcesJson.map((r: any) => ({
        id: r.id,
        usuario_id: r.userId ?? r.user_id ?? 0,
        categoria_id: r.categoryId ?? r.category_id ?? 0,
        titulo: r.title ?? r.titulo ?? '',
        descripcion: r.description ?? r.descripcion ?? '',
        latitud: Number(r.latitude ?? r.latitud ?? 0),
        longitud: Number(r.longitude ?? r.longitud ?? 0),
        estado: r.status ?? r.estado ?? '',
        fecha_creacion: r.createdAt ?? r.fecha_creacion ?? '',
      }));
    } catch (err) {
      // Si no hay backend disponible, mantenemos los datos de ejemplo locales.
      // eslint-disable-next-line no-console
      console.warn('Mapa: no se pudo cargar datos desde backend, usando datos locales', err);
    }
  }

  private initializeMap(): void {
    if (this.map) {
      return;
    }

    const cordobaCoordinates: L.LatLngExpression = [-31.4201, -64.1888];

    this.map = L.map(this.mapContainer.nativeElement, {
      center: cordobaCoordinates,
      zoom: 13,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.necesidades.forEach((necesidad) => {
      this.agregarMarcador(
        necesidad.latitud,
        necesidad.longitud,
        this.needIcon,
        'Necesidad',
        necesidad.titulo,
        necesidad.descripcion,
      );
    });

    this.recursos.forEach((recurso) => {
      this.agregarMarcador(
        recurso.latitud,
        recurso.longitud,
        this.resourceIcon,
        'Recurso',
        recurso.titulo,
        recurso.descripcion,
      );
    });

    requestAnimationFrame(() => {
      this.map?.invalidateSize();
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }
}