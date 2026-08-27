import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-quienes-somos',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './quienes-somos.component.html',
  styleUrl: './quienes-somos.component.scss',
})
export class QuienesSomosComponent {
  // "modifier" arma la clase about__philo-icon--{modifier} (gradiente y
  // color propios de cada tema, ver scss). Íconos Phosphor duotone.
  readonly philoCards = [
    {
      modifier: 't1',
      icon: 'map-pin',
      title: 'Confianza territorial',
      text: 'El aval se adapta a cada lugar. En una ciudad grande, un moderador verifica cada organización; en un pueblo donde ya se conocen, la confianza real permite más autogestión. Ninguna es la correcta: cada una responde a su escala.',
    },
    {
      modifier: 't2',
      icon: 'cube',
      title: 'Asimetría de roles',
      text: 'Lo personal y lo institucional no se mezclan. Un vecino pide desde su cuenta; una organización gestiona sus recursos y su aval desde su panel. Cada quien ve, en el mapa y el menú, solo lo que le corresponde.',
    },
    {
      modifier: 't3',
      icon: 'arrows-clockwise',
      title: 'La ayuda vuelve',
      text: 'Nadie queda fijado a un solo rol. Quien hoy recibe una mano puede, mañana, ser quien la ofrece. El mapa está pensado para que la ayuda circule, no para dividir entre los que dan y los que piden.',
    },
  ];
}
