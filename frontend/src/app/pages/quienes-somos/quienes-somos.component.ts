import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-quienes-somos',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './quienes-somos.component.html',
  styleUrl: './quienes-somos.component.scss',
})
export class QuienesSomosComponent {}
