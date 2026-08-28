import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { HeroConnectionsComponent } from '../../shared/components/hero-connections/hero-connections.component';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterLink, HeroConnectionsComponent, ScrollRevealDirective],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent {
  // Array acá y no en un servicio: es contenido de presentación puro de
  // esta página, no datos -- el @for de abajo evita repetir 3 veces el
  // mismo bloque de markup que solo cambia ícono/color/texto/animación.
  // "modifier" arma la clase inicio__how-icon--{modifier} (gradiente, color
  // y animación propios de cada ícono, ver scss). Íconos Phosphor duotone.
  readonly howSteps = [
    {
      modifier: 'map',
      icon: 'map-pin',
      number: '01',
      title: 'Encontrá ayuda cerca',
      text: 'La ayuda que ya existe en tu barrio, visible en un mapa. Filtrada por tu localidad, porque lo cercano es lo que llega.',
    },
    {
      modifier: 'need',
      icon: 'hand-waving',
      number: '02',
      title: 'Hacé visible tu necesidad',
      text: 'Nadie ayuda a lo que no ve. Publicá lo que necesitás y dejá que tu comunidad lo sepa, sin trámites ni intermediarios.',
    },
    {
      modifier: 'give',
      icon: 'hand-heart',
      number: '03',
      title: 'Devolvé la mano',
      text: 'Doná o recibí, sin intermediarios. Acá la ayuda circula en los dos sentidos: quien hoy recibe, mañana sostiene a otro.',
    },
  ];
}
