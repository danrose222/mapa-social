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
  // mismo bloque de markup que solo cambia ícono/color/texto.
  // Nombres de ícono de Phosphor (peso bold, importado en styles.scss) --
  // "icon" arma la clase CSS ph-{icon} en el template.
  readonly howSteps = [
    {
      icon: 'map-pin',
      iconBg: 'var(--brand-soft)',
      iconColor: 'var(--brand-dark)',
      text: 'Buscá ayuda cerca tuyo',
    },
    {
      icon: 'megaphone',
      iconBg: 'var(--need-color-soft)',
      iconColor: 'var(--need-color)',
      text: 'Publicá tu necesidad si no la encontrás',
    },
    {
      icon: 'handshake',
      iconBg: 'var(--help-color-soft)',
      iconColor: 'var(--help-color)',
      text: 'Doná o recibí apoyo directamente',
    },
  ];
}
