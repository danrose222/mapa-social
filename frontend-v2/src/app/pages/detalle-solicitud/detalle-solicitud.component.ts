import { Component, computed, effect, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { PublicationsService } from '../../core/services/publications.service';
import { AuthService } from '../../core/services/auth.service';
import { Need, Resource, Solicitud } from '../../core/models/mapa-social.model';
import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-detalle-solicitud',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './detalle-solicitud.component.html',
  styleUrl: './detalle-solicitud.component.scss',
})
export class DetalleSolicitudComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly publicationsService = inject(PublicationsService);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;

  readonly need = toSignal<Need | null>(
    this.route.paramMap.pipe(
      switchMap((params) => this.publicationsService.getNeed(Number(params.get('id')))),
    ),
    { initialValue: null },
  );

  readonly isOwner = computed(() => {
    const need = this.need();
    const user = this.currentUser();
    return !!need && !!user && need.userId === user.id;
  });

  // Si el backend ya nos manda contactInfo, es porque ya estamos
  // autorizados (dueño, organización, o nuestra solicitud fue aceptada).
  readonly hasDirectContact = computed(() => !!this.need()?.contactInfo);

  readonly telHref = computed(() => {
    const contact = this.need()?.contactInfo ?? '';
    const digits = contact.replace(/[^\d+]/g, '');
    return digits.length >= 6 ? `tel:${digits}` : null;
  });

  readonly mailHref = computed(() => {
    const contact = this.need()?.contactInfo ?? '';
    return contact.includes('@') ? `mailto:${contact}` : null;
  });

  // --- Vista del ayudante: mi propia solicitud sobre esta necesidad ---
  readonly mySolicitud = signal<Solicitud | null>(null);
  readonly loadingMySolicitud = signal(false);
  readonly messageText = signal('');
  readonly isSubmittingSolicitud = signal(false);
  readonly solicitudError = signal('');

  // --- Vista del dueño: quién se ofreció ---
  readonly solicitudes = signal<Solicitud[]>([]);
  readonly loadingSolicitudes = signal(false);
  readonly processingSolicitudId = signal<number | null>(null);

  // --- Matching: recursos sugeridos para esta necesidad ---
  readonly matches = signal<Resource[]>([]);
  readonly matchesLoading = signal(false);

  private lastLoadedKey = '';
  private lastMatchesNeedId: number | null = null;

  constructor() {
    // Reacciona a que 'need' (y el usuario) tengan un valor real -- no a
    // los params de la ruta directamente, porque esos cambian ANTES de
    // que la llamada HTTP a getNeed() resuelva, y leeríamos need=null.
    effect(() => {
      const need = this.need();
      const user = this.currentUser();

      if (need && need.id !== this.lastMatchesNeedId) {
        this.lastMatchesNeedId = need.id;
        this.loadMatches(need.id);
      }

      if (!need || !user) {
        return;
      }

      const key = `${need.id}:${user.id}`;
      if (key === this.lastLoadedKey) {
        return;
      }
      this.lastLoadedKey = key;

      this.loadRelevantData(need, user.id);
    });
  }

  private loadMatches(needId: number): void {
    this.matchesLoading.set(true);

    this.publicationsService.getMatches(needId).subscribe({
      next: (resources) => {
        this.matches.set(resources);
        this.matchesLoading.set(false);
      },
      error: () => {
        this.matchesLoading.set(false);
      },
    });
  }

  private loadRelevantData(need: Need, userId: number): void {
    if (need.userId === userId) {
      this.loadingSolicitudes.set(true);
      this.publicationsService.getSolicitudesForNeed(need.id).subscribe({
        next: (list) => {
          this.solicitudes.set(list);
          this.loadingSolicitudes.set(false);
        },
        error: () => this.loadingSolicitudes.set(false),
      });
    } else {
      this.loadingMySolicitud.set(true);
      this.publicationsService.getMySolicitudes().subscribe({
        next: (list) => {
          this.mySolicitud.set(list.find((s) => s.needId === need.id) ?? null);
          this.loadingMySolicitud.set(false);
        },
        error: () => this.loadingMySolicitud.set(false),
      });
    }
  }

  ofrecerAyuda(): void {
    const need = this.need();
    if (!need || this.isSubmittingSolicitud()) {
      return;
    }

    this.isSubmittingSolicitud.set(true);
    this.solicitudError.set('');

    this.publicationsService.createSolicitud(need.id, this.messageText() || undefined).subscribe({
      next: (solicitud) => {
        this.isSubmittingSolicitud.set(false);
        this.mySolicitud.set(solicitud);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmittingSolicitud.set(false);
        this.solicitudError.set(
          error.status === 400
            ? 'Esta necesidad ya no está activa.'
            : 'No se pudo enviar. Intentá de nuevo.',
        );
      },
    });
  }

  respond(solicitud: Solicitud, status: 'accepted' | 'rejected'): void {
    const need = this.need();
    if (!need) {
      return;
    }

    this.processingSolicitudId.set(solicitud.id);

    this.publicationsService.updateSolicitudStatus(need.id, solicitud.id, status).subscribe({
      next: () => {
        this.processingSolicitudId.set(null);
        // Forzamos releer, key ya usada -- limpiamos para permitir recarga.
        this.lastLoadedKey = '';
        this.loadRelevantData(need, need.userId);
      },
      error: () => this.processingSolicitudId.set(null),
    });
  }
}
