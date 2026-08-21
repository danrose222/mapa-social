import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-moderador',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-moderador.component.html'
})
export class DashboardModeradorComponent {
  readonly authService = inject(AuthService);
}