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

@Component({
  selector: 'app-location-picker',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div #mapContainer class="location-picker__map"></div>
    <p class="location-picker__hint">Tocá el mapa para marcar la ubicación exacta.</p>
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
      const lat = Math.round(event.latlng.lat * 1e6) / 1e6;
      const lng = Math.round(event.latlng.lng * 1e6) / 1e6;

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

  // Permite recentrar el mapa y confirmar una ubicación desde afuera (ej:
  // al elegir una localidad en el autocomplete) sin que el usuario tenga
  // que tocar el mapa. Reusa el mismo emit que el click manual, así el
  // padre no necesita dos caminos distintos para enterarse de la ubicación.
  moveTo(lat: number, lng: number): void {
    this.map?.setView([lat, lng], 14);
    this.setMarker(lat, lng);
    this.locationSelected.emit({ lat, lng });
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }
}
