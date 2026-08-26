import { Component } from '@angular/core';

// Prueba visual concreta de "el producto funcionando" para el hero: un mapa
// estilizado (no Leaflet real -- un mapa con tiles de verdad en la landing
// suma peso de red a la primera pantalla que ve cualquiera, y acá alcanza
// con la idea) con pines de los 4 actores del modelo (usuario común,
// comunidad, ONG, municipio) apareciendo con un pequeño "pop". Reemplaza a
// HeroNetworkComponent como pieza central del hero -- ese queda sin usar
// acá (sigue disponible para otra pantalla) porque esta versión muestra el
// mapa real de la app, no una ilustración abstracta de la red.
interface PinDemo {
  readonly type: 'individual' | 'comunidad' | 'ong' | 'municipio';
  readonly icon: string;
  readonly label: string;
  readonly top: number;
  readonly left: number;
}

@Component({
  selector: 'app-hero-map-preview',
  standalone: true,
  templateUrl: './hero-map-preview.component.html',
  styleUrl: './hero-map-preview.component.scss',
})
export class HeroMapPreviewComponent {
  readonly pins: PinDemo[] = [
    { type: 'individual', icon: 'user', label: 'Vecino', top: 66, left: 18 },
    { type: 'comunidad', icon: 'house', label: 'Comunidad', top: 28, left: 38 },
    { type: 'ong', icon: 'hand-heart', label: 'ONG', top: 58, left: 64 },
    { type: 'municipio', icon: 'buildings', label: 'Municipio', top: 22, left: 82 },
  ];
}
