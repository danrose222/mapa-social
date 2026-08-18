import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent {}
