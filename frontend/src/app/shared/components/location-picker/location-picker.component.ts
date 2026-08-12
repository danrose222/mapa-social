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

type MarkerColor = 'orange' | 'blue';

const MARKER_ICONS: Record<MarkerColor, L.Icon> = {
  orange: L.icon({
    iconUrl: 'map-icons/marker-icon-orange.png',
    iconRetinaUrl: 'map-icons/marker-icon-2x-orange.png',
    shadowUrl: 'map-icons/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  blue: L.icon({
    iconUrl: 'map-icons/marker-icon-blue.png',
    iconRetinaUrl: 'map-icons/marker-icon-2x-blue.png',
    shadowUrl: 'map-icons/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
};

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.scss',
})
export class LocationPickerComponent implements AfterViewInit, OnDestroy {
  @Input()
  markerColor: MarkerColor = 'blue';

  @ViewChild('locationPickerContainer', { static: true })
  private mapContainer!: ElementRef<HTMLDivElement>;

  @Output()
  readonly locationSelected = new EventEmitter<{
    lat: number;
    lng: number;
  }>();

  private map?: L.Map;
  private marker?: L.Marker;

  ngAfterViewInit(): void {
    const cordobaCoordinates: L.LatLngExpression = [
      -31.4201,
      -64.1888,
    ];

    this.map = L.map(this.mapContainer.nativeElement, {
      center: cordobaCoordinates,
      zoom: 13,
    });

    L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      },
    ).addTo(this.map);

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      const lat = Math.round(event.latlng.lat * 1e6) / 1e6;
      const lng = Math.round(event.latlng.lng * 1e6) / 1e6;

      this.setMarker(lat, lng);
      this.locationSelected.emit({ lat, lng });
    });

    requestAnimationFrame(() => {
      this.map?.invalidateSize();
    });
  }

  private setMarker(lat: number, lng: number): void {
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
      return;
    }

    this.marker = L.marker([lat, lng], {
      icon: MARKER_ICONS[this.markerColor],
    }).addTo(this.map!);
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }
}
