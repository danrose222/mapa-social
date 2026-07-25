import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
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
  encapsulation: ViewEncapsulation.None,
  template: `
    <mat-card class="map-card">
      <header class="map-header">
        <h1 class="map-title">Mapa Social</h1>

        <p class="map-subtitle">
          Necesidades comunitarias y recursos disponibles
        </p>

        <div
          class="map-legend"
          aria-label="Referencias del mapa"
        >
          <span class="legend-item">
            <span
              class="legend-color legend-color--need"
              aria-hidden="true"
            ></span>

            Necesidades
          </span>

          <span class="legend-item">
            <span
              class="legend-color legend-color--resource"
              aria-hidden="true"
            ></span>

            Recursos
          </span>
        </div>
      </header>

      <div class="map-content">
        <div
          #mapContainer
          class="map-container"
          aria-label="Mapa social interactivo"
        ></div>
      </div>
    </mat-card>
  `,
  styles: [
    `
      app-mapa {
        display: block;
        padding: 24px;
      }

      app-mapa .map-card {
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        border: 1px solid rgb(47 131 168 / 28%);
        border-radius: 12px;
        background-color: var(--color-primary);
        box-shadow: 0 8px 22px rgb(24 63 82 / 14%);
        transition:
          border-color 180ms ease,
          box-shadow 180ms ease;
      }

      app-mapa .map-card:hover {
        border-color: rgb(230 95 50 / 45%);
        box-shadow: 0 10px 24px rgb(24 63 82 / 18%);
      }

      app-mapa .map-header {
        padding: 20px 18px 14px;
        background-color: var(--color-primary);
      }

      app-mapa .map-title {
        margin: 0;
        color: #ffffff !important;
        font-family: Roboto, "Helvetica Neue", sans-serif;
        font-size: 1.35rem;
        font-weight: 600;
        line-height: 1.25;
      }

      app-mapa .map-subtitle {
        margin: 5px 0 0;
        color: #ffffff !important;
        font-family: Roboto, "Helvetica Neue", sans-serif;
        font-size: 0.9rem;
        font-weight: 400;
        line-height: 1.4;
        opacity: 0.82;
      }

      app-mapa .map-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        margin-top: 10px;
      }

      app-mapa .legend-item {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 0;
        border: 0;
        background: transparent;
        color: #ffffff !important;
        font-family: Roboto, "Helvetica Neue", sans-serif;
        font-size: 0.88rem;
        font-weight: 500;
        line-height: 1;
      }

      app-mapa .legend-color {
        width: 10px;
        height: 10px;
        flex: 0 0 10px;
        border-radius: 50%;
      }

      app-mapa .legend-color--need {
        background-color: var(--color-accent);
      }

      app-mapa .legend-color--resource {
        background-color: var(--color-secondary);
      }

      app-mapa .map-content {
        padding: 0 16px 16px;
        background-color: var(--color-primary);
      }

      app-mapa .map-container {
        width: 100%;
        height: 600px;
        min-height: 400px;
        overflow: hidden;
        border: 1px solid rgb(47 131 168 / 38%);
        border-radius: 8px;
        background-color: var(--color-primary);
        transition:
          border-color 180ms ease,
          box-shadow 180ms ease;
      }

      app-mapa .map-container:hover {
        border-color: rgb(230 95 50 / 55%);
        box-shadow: 0 0 0 2px rgb(230 95 50 / 10%);
      }

      app-mapa .cold-map-tiles {
        filter:
          grayscale(0.15)
          sepia(0.08)
          hue-rotate(145deg)
          saturate(0.82)
          brightness(0.88)
          contrast(1.08);
      }

      app-mapa .leaflet-control-zoom {
        overflow: hidden;
        border: 0 !important;
        border-radius: 6px !important;
        box-shadow: 0 3px 10px rgb(24 63 82 / 22%) !important;
      }

      app-mapa .leaflet-control-zoom a {
        display: grid;
        width: 32px;
        height: 32px;
        place-items: center;
        border: 0 !important;
        background-color: rgb(24 63 82 / 94%);
        color: #ffffff !important;
        font-size: 18px;
        font-weight: 400;
        line-height: 32px;
        transition:
          background-color 180ms ease,
          color 180ms ease;
      }

      app-mapa .leaflet-control-zoom a:first-child {
        border-bottom:
          1px solid rgb(255 255 255 / 14%) !important;
      }

      app-mapa .leaflet-control-zoom a:hover {
        background-color: var(--color-accent);
        color: #ffffff !important;
      }

      app-mapa .leaflet-control-zoom a.leaflet-disabled {
        background-color: rgb(24 63 82 / 65%);
        color: rgb(255 255 255 / 45%) !important;
      }

      app-mapa .leaflet-popup-content-wrapper {
        border-top: 3px solid var(--color-secondary);
        border-radius: 9px;
        background-color: var(--color-primary);
        color: #ffffff;
      }

      app-mapa .leaflet-popup-tip {
        background-color: var(--color-primary);
      }

      app-mapa .leaflet-popup-content {
        line-height: 1.5;
      }

      app-mapa .leaflet-popup-content strong:first-child {
        color: var(--color-accent);
      }

      app-mapa .leaflet-control-attribution {
        padding: 2px 5px;
        background-color: rgb(24 63 82 / 78%) !important;
        color: rgb(255 255 255 / 78%) !important;
        font-size: 10px;
      }

      app-mapa .leaflet-control-attribution a {
        color: #9bd9e9 !important;
      }

      @media (max-width: 768px) {
        app-mapa {
          padding: 12px;
        }

        app-mapa .map-header {
          padding: 16px 14px 12px;
        }

        app-mapa .map-content {
          padding: 0 12px 12px;
        }

        app-mapa .map-container {
          height: 70vh;
          min-height: 350px;
        }

        app-mapa .map-legend {
          gap: 14px;
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
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
    iconRetinaUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange-2x.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  private readonly resourceIcon = L.icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    iconRetinaUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue-2x.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
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
    const marker = L.marker(
      [latitud, longitud],
      { icon },
    ).addTo(this.map!);

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
        throw new Error(
          `Error al cargar datos: ${needsRes.status} / ${resourcesRes.status}`,
        );
      }

      const [needsJson, resourcesJson] = await Promise.all([
        needsRes.json(),
        resourcesRes.json(),
      ]);

      this.necesidades = needsJson.map((n: any) => ({
        id: n.id,
        usuario_id: n.userId ?? n.user_id ?? 0,
        categoria_id:
          n.categoryId ?? n.category_id ?? 0,
        titulo: n.title ?? n.titulo ?? '',
        descripcion:
          n.description ?? n.descripcion ?? '',
        latitud: Number(
          n.latitude ?? n.latitud ?? 0,
        ),
        longitud: Number(
          n.longitude ?? n.longitud ?? 0,
        ),
        estado: n.status ?? n.estado ?? '',
        fecha_creacion:
          n.createdAt ?? n.fecha_creacion ?? '',
      }));

      this.recursos = resourcesJson.map((r: any) => ({
        id: r.id,
        usuario_id: r.userId ?? r.user_id ?? 0,
        categoria_id:
          r.categoryId ?? r.category_id ?? 0,
        titulo: r.title ?? r.titulo ?? '',
        descripcion:
          r.description ?? r.descripcion ?? '',
        latitud: Number(
          r.latitude ?? r.latitud ?? 0,
        ),
        longitud: Number(
          r.longitude ?? r.longitud ?? 0,
        ),
        estado: r.status ?? r.estado ?? '',
        fecha_creacion:
          r.createdAt ?? r.fecha_creacion ?? '',
      }));
    } catch (err) {
      // Si no hay backend disponible, mantenemos los datos locales.
      // eslint-disable-next-line no-console
      console.warn(
        'Mapa: no se pudo cargar datos desde backend, usando datos locales',
        err,
      );
    }
  }

  private initializeMap(): void {
    if (this.map) {
      return;
    }

    const cordobaCoordinates: L.LatLngExpression = [
      -31.4201,
      -64.1888,
    ];

    this.map = L.map(
      this.mapContainer.nativeElement,
      {
        center: cordobaCoordinates,
        zoom: 13,
      },
    );

    L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        className: 'cold-map-tiles',
        attribution:
          '&copy; OpenStreetMap contributors',
      },
    ).addTo(this.map);

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