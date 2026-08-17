import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { PublicationsService } from '../../core/services/publications.service';
import { Need } from '../../core/models/mapa-social.model';
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

  readonly need = toSignal<Need | null>(
    this.route.paramMap.pipe(
      switchMap((params) => this.publicationsService.getNeed(Number(params.get('id')))),
    ),
    { initialValue: null },
  );

  readonly showContactPanel = signal(false);

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

  confirmarAyuda(): void {
    this.showContactPanel.set(true);
  }
}
