import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-publicar-choice',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './publicar-choice.component.html',
  styleUrl: './publicar-choice.component.scss',
})
export class PublicarChoiceComponent {
  constructor(private readonly router: Router) {}

  goTo(path: string): void {
    this.router.navigateByUrl(path);
  }
}
