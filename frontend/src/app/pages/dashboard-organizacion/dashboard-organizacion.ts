import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service'; 

@Component({
  selector: 'app-dashboard-organizacion',
  standalone: true,
  imports: [CommonModule,],
  templateUrl: './dashboard-organizacion.html',
  styleUrl: './dashboard-organizacion.scss',
})
export class DashboardOrganizacion {
  // Inyectamos el AuthService como público/readonly para consumirlo directamente en la plantilla HTML
  readonly authService = inject(AuthService);
}