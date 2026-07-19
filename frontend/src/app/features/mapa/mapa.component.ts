import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import * as L from 'leaflet';

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

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  private initializeMap(): void {
    if (this.map) {
      return;
    }

    const rosarioCoordinates: L.LatLngExpression = [
      -32.9442,
      -60.6505,
    ];

    this.map = L.map(this.mapContainer.nativeElement, {
      center: rosarioCoordinates,
      zoom: 13,
    });

    L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      },
    ).addTo(this.map);

    setTimeout(() => {
      this.map?.invalidateSize();
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }
}