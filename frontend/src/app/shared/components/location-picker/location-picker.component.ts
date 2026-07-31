import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';

import * as L from 'leaflet';

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.scss',
})
export class LocationPickerComponent implements AfterViewInit, OnDestroy {
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

    this.marker = L.marker([lat, lng]).addTo(this.map!);
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }
}
