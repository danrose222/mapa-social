import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  input,
  output,
} from '@angular/core';
import * as L from 'leaflet';

const DEFAULT_CENTER: L.LatLngExpression = [-31.4201, -64.1888];

@Component({
  selector: 'app-location-picker',
  standalone: true,
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.scss',
})
export class LocationPickerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('pickerContainer', { static: true })
  private pickerContainer!: ElementRef<HTMLDivElement>;

  readonly markerColor = input<'orange' | 'blue'>('orange');
  readonly initialLat = input<number | null>(null);
  readonly initialLng = input<number | null>(null);

  readonly positionChange = output<{ lat: number; lng: number }>();

  private map?: L.Map;
  private marker?: L.Marker;

  private readonly icons: Record<'orange' | 'blue', L.Icon> = {
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

  ngAfterViewInit(): void {
    const hasInitialPosition =
      this.initialLat() !== null && this.initialLng() !== null;

    const center: L.LatLngExpression = hasInitialPosition
      ? [this.initialLat()!, this.initialLng()!]
      : DEFAULT_CENTER;

    this.map = L.map(this.pickerContainer.nativeElement, {
      center,
      zoom: 13,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    if (hasInitialPosition) {
      this.placeMarker(center);
    }

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.placeMarker(event.latlng);
    });

    requestAnimationFrame(() => {
      this.map?.invalidateSize();
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }

  private placeMarker(latlng: L.LatLngExpression): void {
    if (!this.map) {
      return;
    }

    if (this.marker) {
      this.marker.setLatLng(latlng);
    } else {
      this.marker = L.marker(latlng, {
        icon: this.icons[this.markerColor()],
      }).addTo(this.map);
    }

    const { lat, lng } = this.marker.getLatLng();

    // El backend valida las coordenadas con maxDecimalPlaces: 8, y Leaflet
    // devuelve la precisión completa de punto flotante (15+ decimales), así
    // que hay que redondear antes de enviarlas.
    this.positionChange.emit({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    });
  }
}
