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

  
  // hay que reemplazar este arreglo por datos obtenidos desde MapaService
  // cuando esté disponible la API.
  private readonly necesidades: Necesidad[] = [
    {
      id: 1,
      usuario_id: 10,
      categoria_id: 2,
      titulo: 'Ayuda escolar urgente',
      descripcion: 'La escuela necesita materiales didácticos y apoyo para el comedor escolar.',
      latitud: -31.4213,
      longitud: -64.1914,
      estado: 'pendiente',
      fecha_creacion: '2026-07-22 09:15:00',
    },
    {
      id: 2,
      usuario_id: 12,
      categoria_id: 3,
      titulo: 'Refuerzo de salud comunitaria',
      descripcion: 'Actividad de salud preventiva para adultos mayores requiere voluntarios.',
      latitud: -31.4170,
      longitud: -64.1887,
      estado: 'pendiente',
      fecha_creacion: '2026-07-21 16:30:00',
    },
  ];

  // Hay que reemplazar este arreglo por datos obtenidos desde MapaService
  // cuando esté disponible la API REST.
  private readonly recursos: Recurso[] = [
    {
      id: 1,
      usuario_id: 20,
      categoria_id: 5,
      titulo: 'Entrega de alimentos',
      descripcion: 'ONG local ofrece canastas básicas y asistencia alimentaria.',
      latitud: -31.3965,
      longitud: -64.1865,
      estado: 'activo',
      fecha_creacion: '2026-07-20 11:40:00',
    },
    {
      id: 2,
      usuario_id: 21,
      categoria_id: 4,
      titulo: 'Capacitación laboral',
      descripcion: 'Recurso disponible para entrenamiento en oficios y búsqueda laboral.',
      latitud: -31.4192,
      longitud: -64.1836,
      estado: 'activo',
      fecha_creacion: '2026-07-19 14:05:00',
    },
  ];

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
    this.initializeMap();
  }

  private initializeMap(): void {
    if (this.map) {
      return;
    }

    const cordobaCoordinates: L.LatLngExpression = [
      -31.4201,
      -64.1888,
    ];

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