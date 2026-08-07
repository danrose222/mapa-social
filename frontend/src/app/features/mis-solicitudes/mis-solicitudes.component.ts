import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { AuthService } from '../../core/services/auth.service';

interface SolicitudMia {
  id: number;
  status: string;
  contactName?: string;
  contactInfo?: string;
  createdAt: string;
  resource?: {
    id: number;
    title: string;
    organizationName?: string;
  };
  target?: {
    id: number;
    organizationName?: string;
    firstName: string;
    lastName: string;
  };
  category?: {
    id: number;
    name: string;
  };
}

interface DestinatarioAyuda {
  id: number;
  organizationName: string;
  ciudad?: string;
  role: 'moderador' | 'ong' | 'comunidad';
}

interface CategoriaAyuda {
  id: number;
  name: string;
}

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada · esperando que retires el beneficio',
  atendida: 'Atendida',
  rechazada: 'Rechazada',
  derivada: 'Derivada a otra entidad',
};

@Component({
  selector: 'app-mis-solicitudes',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, FormsModule],
  templateUrl: './mis-solicitudes.component.html',
  styleUrl: './mis-solicitudes.component.scss',
})
export class MisSolicitudesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  readonly solicitudes = signal<SolicitudMia[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly esComunidad = signal(
    this.authService.currentUser()?.role === 'comunidad',
  );

  readonly esOng = signal(this.authService.currentUser()?.role === 'ong');

  readonly esModerador = signal(
    this.authService.currentUser()?.role === 'moderador',
  );

  readonly puedePedirAyudaDirecta = signal(
    this.esComunidad() || this.esOng() || this.esModerador(),
  );

  readonly nombrePersona = signal('');
  readonly contactoPersona = signal('');
  readonly direccionPersona = signal('');

  readonly estadoAyuda = signal(
    this.authService.currentUser()?.estadoAyuda ?? 'estable',
  );

  readonly guardandoEstado = signal(false);

  readonly destinatarios = signal<DestinatarioAyuda[]>([]);
  readonly categorias = signal<CategoriaAyuda[]>([]);
  readonly destinatarioSeleccionado = signal<number | null>(null);
  readonly categoriaSeleccionada = signal<number | null>(null);
  readonly enviandoPedido = signal(false);
  readonly mensajePedido = signal('');

  ngOnInit(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.http.get<SolicitudMia[]>('/api/solicitudes/mias').subscribe({
      next: (solicitudes) => {
        this.solicitudes.set(solicitudes);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar tus solicitudes.');
        this.isLoading.set(false);
      },
    });

    if (this.puedePedirAyudaDirecta()) {
      this.cargarDirectorioYCategorias();
    }
  }

  // Una comunidad le puede pedir ayuda al municipio o a una ONG; una ONG
  // solo le puede pedir ayuda a otra ONG (nunca al municipio, que solo la
  // aprueba pero no le brinda ayuda directa); un moderador deriva a un
  // tercero que se acerco en persona hacia una comunidad u ONG.
  tituloPedirAyuda(): string {
    if (this.esModerador()) {
      return '¿Atendés a alguien en el municipio? Derivalo a una comunidad u ONG';
    }

    return this.esOng()
      ? '¿Te quedaste sin recursos? Pedile ayuda a otra ONG'
      : '¿Necesitás pedirle ayuda al municipio o a una ONG?';
  }

  private cargarDirectorioYCategorias(): void {
    // El moderador deriva hacia cualquier comunidad u ONG aprobada (no hacia
    // otro municipio), el mismo listado que usa "derivar" en solicitudes
    // recibidas. Comunidad/ong usan el directorio de a quien pedirle.
    const endpointDestinatarios = this.esModerador()
      ? '/api/users/directorio-derivar'
      : '/api/users/directorio-ayuda';

    this.http
      .get<DestinatarioAyuda[]>(endpointDestinatarios)
      .subscribe({
        next: (destinatarios) => this.destinatarios.set(destinatarios),
        error: () => {
          /* si falla, simplemente no se muestran opciones */
        },
      });

    this.http.get<CategoriaAyuda[]>('/api/categories').subscribe({
      next: (categorias) => this.categorias.set(categorias),
      error: () => {
        /* si falla, simplemente no se muestran opciones */
      },
    });
  }

  pedirAyuda(): void {
    const targetUserId = this.destinatarioSeleccionado();
    const categoryId = this.categoriaSeleccionada();

    if (!targetUserId || !categoryId) {
      this.mensajePedido.set('Elegí a quién pedirle y qué tipo de ayuda necesitás.');
      return;
    }

    const body: Record<string, unknown> = { targetUserId, categoryId };

    if (this.esModerador()) {
      if (!this.nombrePersona().trim()) {
        this.mensajePedido.set('Ingresá el nombre de la persona a la que estás derivando.');
        return;
      }

      if (!this.contactoPersona().trim() && !this.direccionPersona().trim()) {
        this.mensajePedido.set('Dejá un contacto o una dirección para esa persona.');
        return;
      }

      body['contactName'] = this.nombrePersona().trim();
      body['contactInfo'] = this.contactoPersona().trim() || undefined;
      body['address'] = this.direccionPersona().trim() || undefined;
    }

    this.enviandoPedido.set(true);
    this.mensajePedido.set('');

    this.http
      .post('/api/solicitudes/directa', body)
      .subscribe({
        next: () => {
          this.enviandoPedido.set(false);
          this.mensajePedido.set(
            this.esModerador()
              ? 'La derivación fue enviada.'
              : 'Tu pedido de ayuda fue enviado.',
          );
          this.destinatarioSeleccionado.set(null);
          this.categoriaSeleccionada.set(null);
          this.nombrePersona.set('');
          this.contactoPersona.set('');
          this.direccionPersona.set('');

          this.http.get<SolicitudMia[]>('/api/solicitudes/mias').subscribe({
            next: (solicitudes) => this.solicitudes.set(solicitudes),
          });
        },
        error: (err) => {
          this.enviandoPedido.set(false);
          this.mensajePedido.set(
            err?.error?.message ?? 'No se pudo enviar el pedido de ayuda.',
          );
        },
      });
  }

  cambiarEstadoAyuda(nuevoEstado: 'estable' | 'critico'): void {
    if (nuevoEstado === this.estadoAyuda()) {
      return;
    }

    const usuario = this.authService.currentUser();

    if (!usuario) {
      return;
    }

    this.guardandoEstado.set(true);

    this.http
      .patch(`/api/users/${usuario.id}`, { estadoAyuda: nuevoEstado })
      .subscribe({
        next: () => {
          this.guardandoEstado.set(false);
          this.estadoAyuda.set(nuevoEstado);
          this.authService.actualizarUsuarioActual({
            estadoAyuda: nuevoEstado,
          });
        },
        error: () => {
          this.guardandoEstado.set(false);
          this.errorMessage.set('No se pudo actualizar tu estado.');
        },
      });
  }

  etiquetaEstado(status: string): string {
    return ETIQUETA_ESTADO[status] ?? status;
  }

  tituloDe(solicitud: SolicitudMia): string {
    if (solicitud.resource) {
      return solicitud.resource.title;
    }

    return `Pedido de ayuda: ${solicitud.category?.name ?? ''}`;
  }

  subtituloDe(solicitud: SolicitudMia): string | undefined {
    if (solicitud.resource) {
      return solicitud.resource.organizationName;
    }

    const target = solicitud.target;

    return target
      ? `A ${target.organizationName ?? `${target.firstName} ${target.lastName}`}`
      : undefined;
  }
}
