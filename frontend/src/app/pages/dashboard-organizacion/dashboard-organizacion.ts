import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ActorPanelService, OngPendingAudit } from '../../core/services/actor-panel.service';

@Component({
  selector: 'app-dashboard-organizacion',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-organizacion.html',
  styleUrl: './dashboard-organizacion.scss',
})
export class DashboardOrganizacion implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly actorService = inject(ActorPanelService);

  readonly userRole = signal<string | null>(null);
  readonly isLoading = signal(true);

  // Datos para vista Municipio
  readonly pendingOngs = signal<OngPendingAudit[]>([]);

  // Datos para vista ONG / Comunidad
  readonly resourcesCount = signal(0);
  readonly needsCount = signal(0);

  ngOnInit(): void {
    const profile = this.authService.profile();
    const role = profile?.role?.name ?? null;
    this.userRole.set(role);

    this.loadDashboardData(role);
  }

  loadDashboardData(role: string | null): void {
    this.isLoading.set(true);

    if (role === 'municipio') {
      // 🏛️ MUNICIPIO: Cargar ONGs pendientes de auditoría
      this.actorService.getPendingOngs().subscribe({
        next: (ongs) => {
          this.pendingOngs.set(ongs);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
    } else {
      // 🤝 ONG / COMUNIDAD: Cargar métricas de gestión propia
      this.actorService.getMyResources().subscribe((res) => this.resourcesCount.set(res.length));
      this.actorService.getMyNeeds().subscribe((needs) => {
        this.needsCount.set(needs.length);
        this.isLoading.set(false);
      });
    }
  }

  // Acciones exclusivas de Municipio
  approveOng(id: string): void {
    this.actorService.approveOng(id).subscribe(() => this.loadDashboardData('municipio'));
  }

  rejectOng(id: string): void {
    this.actorService.rejectOng(id).subscribe(() => this.loadDashboardData('municipio'));
  }
}