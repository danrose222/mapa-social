import { Component } from '@angular/core';

// Los pulsos que viajan por las conexiones son <animateMotion> (SMIL), no
// @keyframes CSS -- la regla global de prefers-reduced-motion en styles.scss
// solo pisa animation-duration/transition-duration, no tiene efecto acá.
// Por eso se chequea una vez al construir el componente y esos elementos ni
// se renderizan si el usuario pidió menos movimiento.
@Component({
  selector: 'app-hero-connections',
  standalone: true,
  templateUrl: './hero-connections.component.html',
  styleUrl: './hero-connections.component.scss',
})
export class HeroConnectionsComponent {
  readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
