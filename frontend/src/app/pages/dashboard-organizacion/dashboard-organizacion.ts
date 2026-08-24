import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActorPanelService } from '../../core/services/actor-panel.service';

// Panel de gestión propia para ONG / Comunidad -- el actor Municipio no
// entra por acá (ver /moderador/organizaciones, que es la página real de
// aval; no hay ninguna cuenta vinculada a un municipio en el sistema).
@Component({
  selector: 'app-dashboard-organizacion',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-organizacion.html',
  styleUrl: './dashboard-organizacion.scss',
})
export class DashboardOrganizacion implements OnInit {
  private readonly actorService = inject(ActorPanelService);

  readonly isLoading = signal(true);
  readonly resourcesCount = signal(0);
  readonly needsCount = signal(0);

  ngOnInit(): void {
    this.actorService.getMyResources().subscribe((res) => this.resourcesCount.set(res.length));
    this.actorService.getMyNeeds().subscribe({
      next: (needs) => {
        this.needsCount.set(needs.length);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
