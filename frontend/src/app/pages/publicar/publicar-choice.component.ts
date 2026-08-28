import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { IconComponent } from '../../shared/icons/icon.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-publicar-choice',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './publicar-choice.component.html',
  styleUrl: './publicar-choice.component.scss',
})
export class PublicarChoiceComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly canPublishResource = this.authService.canPublishResource;

  goTo(path: string): void {
    this.router.navigateByUrl(path);
  }
}
