import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../shared/icons/icon.component';
import { HeroNetworkComponent } from '../../shared/components/hero-network/hero-network.component';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterLink, IconComponent, HeroNetworkComponent, ScrollRevealDirective],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent {
  // Array acá y no en un servicio: es contenido de presentación puro de
  // esta página, no datos -- el @for de abajo evita repetir 3 veces el
  // mismo bloque de markup que solo cambia ícono/color/texto.
  readonly howSteps = [
    {
      icon: 'pin' as const,
      iconBg: 'var(--brand-soft)',
      iconColor: 'var(--brand-dark)',
      text: 'Buscá ayuda cerca tuyo',
    },
    {
      icon: 'hands' as const,
      iconBg: 'var(--need-color-soft)',
      iconColor: 'var(--need-color)',
      text: 'Publicá tu necesidad si no la encontrás',
    },
    {
      icon: 'helpingHand' as const,
      iconBg: 'var(--help-color-soft)',
      iconColor: 'var(--help-color)',
      text: 'Doná o recibí apoyo directamente',
    },
  ];
}
