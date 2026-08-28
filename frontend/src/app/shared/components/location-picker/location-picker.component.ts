import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';

import * as L from 'leaflet';

import { roundCoordinate } from '../../utils/coordinates.util';

@Component({
  selector: 'app-location-picker',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div #mapContainer class="location-picker__map"></div>
    <p class="location-picker__hint">{{ hint }}</p>
  `,
  styles: [
    `
      app-location-picker {
        display: block;
      }

      .location-picker__map {
        width: 100%;
        height: 260px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        overflow: hidden;
      }

      .location-picker__hint {
        margin-top: 6px;
        color: var(--ink-soft);
        font-size: 0.78rem;
      }
    `,
  ],
})
export class LocationPickerComponent implements AfterViewInit, OnDestroy {
  @Input() initialLat = -31.4201;
  @Input() initialLng = -64.1888;
  @Input() hint = 'Tocá el mapa para marcar la ubicación exacta.';

  @ViewChild('mapContainer', { static: true })
  private mapContainer!: ElementRef<HTMLDivElement>;

  @Output()
  readonly locationSelected = new EventEmitter<{ lat: number; lng: number }>();

  private readonly icon = L.icon({
    iconUrl: 'map-icons/marker-icon-orange.png',
    iconRetinaUrl: 'map-icons/marker-icon-2x-orange.png',
    shadowUrl: 'map-icons/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  private map?: L.Map;
  private marker?: L.Marker;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [this.initialLat, this.initialLng],
      zoom: 13,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      const lat = roundCoordinate(event.latlng.lat);
      const lng = roundCoordinate(event.latlng.lng);

      this.setMarker(lat, lng);
      this.locationSelected.emit({ lat, lng });
    });

    requestAnimationFrame(() => this.map?.invalidateSize());
  }

  private setMarker(lat: number, lng: number): void {
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
      return;
    }

    this.marker = L.marker([lat, lng], { icon: this.icon }).addTo(this.map!);
  }

  // Reposiciona el mapa desde afuera (ej: al geocodificar la localidad o
  // la dirección escritas) sin emitir `locationSelected` -- ese evento
  // queda reservado para el click manual, que el padre usa para saber
  // que el usuario ya afinó el punto a mano y no debe volver a moverse
  // solo. El padre es responsable de sincronizar el form con el punto
  // que le pasa acá.
  moveTo(lat: number, lng: number): void {
    this.map?.setView([lat, lng], 14);
    this.setMarker(lat, lng);
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }
}
