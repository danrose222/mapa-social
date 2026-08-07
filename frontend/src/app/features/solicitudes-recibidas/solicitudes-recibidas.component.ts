import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { AuthService } from '../../core/services/auth.service';

interface SolicitudRecibida {
  id: number;
  status: string;
  contactName?: string;
  contactInfo?: string;
  address?: string;
  createdAt: string;
  resource: {
    id: number;
    title: string;
  } | null;
  category?: {
    id: number;
    name: string;
  };
  user: {
    id: number;
    firstName: string;
    lastName: string;
    organizationName?: string;
  };
}

interface EntidadDerivar {
  id: number;
  organizationName: string;
  ciudad?: string;
  role: 'comunidad' | 'ong';
}

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada · esperando que retire el beneficio',
  atendida: 'Atendida',
  rechazada: 'Rechazada',
  derivada: 'Derivada a otra entidad',
};

@Component({
  selector: 'app-solicitudes-recibidas',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, FormsModule],
  templateUrl: './solicitudes-recibidas.component.html',
  styleUrl: './solicitudes-recibidas.component.scss',
})
export class SolicitudesRecibidasComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  readonly solicitudes = signal<SolicitudRecibida[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly actualizandoId = signal<number | null>(null);

  readonly entidadesDerivar = signal<EntidadDerivar[]>([]);
  readonly derivarSeleccion = signal<Record<number, number | null>>({});
  readonly derivandoId = signal<number | null>(null);
  readonly derivarMensaje = signal<Record<number, string>>({});

  ngOnInit(): void {
    this.cargarSolicitudes();
    this.cargarEntidadesDerivar();
  }

  private cargarSolicitudes(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.http
      .get<SolicitudRecibida[]>('/api/solicitudes/recibidas')
      .subscribe({
        next: (solicitudes) => {
          this.solicitudes.set(solicitudes);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar las solicitudes recibidas.');
          this.isLoading.set(false);
        },
      });
  }

  private cargarEntidadesDerivar(): void {
    this.http.get<EntidadDerivar[]>('/api/users/directorio-derivar').subscribe({
      next: (entidades) => this.entidadesDerivar.set(entidades),
      error: () => {
        /* si falla, simplemente no se muestra la opción de derivar */
      },
    });
  }

  etiquetaEstado(status: string): string {
    return ETIQUETA_ESTADO[status] ?? status;
  }

  // Quien la envio (institucion) es distinto de a quien hay que contactar
  // (el beneficiario): si contactName esta cargado y quien la mando tiene
  // organizationName, es una derivacion de un tercero (por ejemplo, el
  // municipio atendiendo a alguien en persona), no un pedido directo.
  derivadoPor(solicitud: SolicitudRecibida): string | null {
    if (!solicitud.contactName || !solicitud.user.organizationName) {
      return null;
    }

    return solicitud.user.organizationName;
  }

  // Arma un link con el mensaje ya redactado para avisarle al beneficiario
  // que pase a retirar el recurso: un email valido usa mailto: (con asunto
  // y cuerpo), algo que parece telefono usa sms: (con el mensaje ya
  // cargado, no tel: que solo llama sin dejar nada por escrito). Si no
  // matchea ninguno de los dos, no hay nada para clickear.
  contactoHref(solicitud: SolicitudRecibida): string | null {
    const valor = solicitud.contactInfo?.trim();

    if (!valor) {
      return null;
    }

    const mensaje = this.mensajeAviso(solicitud);

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
      const asunto = encodeURIComponent('Ya podés retirar tu ayuda');
      return `mailto:${valor}?subject=${asunto}&body=${encodeURIComponent(mensaje)}`;
    }

    if (/^[\d\s()+-]{6,}$/.test(valor)) {
      const numero = valor.replace(/[\s()-]/g, '');
      // iOS espera "&" antes de body en sms:, el resto de los navegadores
      // espera "?": sin este detalle el mensaje no queda precargado en la
      // mitad de los celulares.
      const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const separador = esIOS ? '&' : '?';
      return `sms:${numero}${separador}body=${encodeURIComponent(mensaje)}`;
    }

    return null;
  }

  private mensajeAviso(solicitud: SolicitudRecibida): string {
    const queRetira = solicitud.resource?.title ?? solicitud.category?.name ?? 'tu ayuda';
    const quien = solicitud.contactName ?? solicitud.user.firstName;
    const nosotros = this.authService.nombreParaMostrar() || 'nuestra organización';

    return `Hola ${quien}, te escribimos de ${nosotros}: ya podés pasar a retirar ${queRetira}. ¡Te esperamos!`;
  }

  actualizar(id: number, status: 'aprobada' | 'atendida' | 'rechazada'): void {
    this.actualizandoId.set(id);

    this.http.patch(`/api/solicitudes/${id}`, { status }).subscribe({
      next: () => {
        this.actualizandoId.set(null);
        this.solicitudes.update((lista) =>
          lista.map((solicitud) =>
            solicitud.id === id ? { ...solicitud, status } : solicitud,
          ),
        );
      },
      error: () => {
        this.actualizandoId.set(null);
        this.errorMessage.set('No se pudo actualizar la solicitud.');
      },
    });
  }

  destinoDerivarSeleccionado(id: number): number | null {
    return this.derivarSeleccion()[id] ?? null;
  }

  setDestinoDerivar(id: number, targetUserId: number | null): void {
    this.derivarSeleccion.update((mapa) => ({ ...mapa, [id]: targetUserId }));
  }

  derivar(id: number): void {
    const targetUserId = this.destinoDerivarSeleccionado(id);

    if (!targetUserId) {
      this.derivarMensaje.update((mapa) => ({
        ...mapa,
        [id]: 'Elegí a quién derivarla.',
      }));
      return;
    }

    this.derivandoId.set(id);

    this.http.post(`/api/solicitudes/${id}/derivar`, { targetUserId }).subscribe({
      next: () => {
        this.derivandoId.set(null);
        this.solicitudes.update((lista) =>
          lista.map((solicitud) =>
            solicitud.id === id
              ? { ...solicitud, status: 'derivada' }
              : solicitud,
          ),
        );
      },
      error: (err) => {
        this.derivandoId.set(null);
        this.derivarMensaje.update((mapa) => ({
          ...mapa,
          [id]: err?.error?.message ?? 'No se pudo derivar la solicitud.',
        }));
      },
    });
  }
}
