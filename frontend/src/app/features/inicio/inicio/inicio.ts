import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { HeroNetworkComponent } from '../hero-network/hero-network.component';

interface SolicitudMiaResumen {
  id: number;
  status: string;
  createdAt: string;
  // Ausente cuando la solicitud es un pedido de ayuda directo (a un
  // municipio u ONG) en vez de sobre un recurso puntual ya publicado.
  resource?: { id: number; title: string; organizationName?: string };
  target?: { id: number; organizationName?: string; firstName: string; lastName: string };
  category?: { id: number; name: string };
}

interface SolicitudRecibidaResumen {
  id: number;
  status: string;
  contactName?: string;
  resource?: { id: number; title: string };
  category?: { id: number; name: string };
  user: { id: number; firstName: string; lastName: string };
}

interface Latido {
  icon: string;
  tinte: 'terracota' | 'salvia' | 'dorado';
  mensajes: string[];
}

// Contenido ilustrativo, no datos en vivo: todavía no hay un feed real
// de eventos en el backend. La redacción evita dar a entender que esto
// "está pasando ahora" (nada de "hace 2 minutos" ni contadores en vivo)
// para no simular actividad falsa en una plataforma que maneja pedidos
// de ayuda genuinos.
const LATIDOS: Latido[] = [
  {
    icon: 'handshake',
    tinte: 'terracota',
    mensajes: [
      'Así se ve cuando una ONG aprueba una solicitud de recursos.',
      'Una comunidad confirma ayuda para una familia del barrio.',
    ],
  },
  {
    icon: 'favorite',
    tinte: 'salvia',
    mensajes: [
      'Un vecino pide ayuda directo a su comunidad.',
      'Alguien encuentra la ayuda que necesita, cerca de casa.',
    ],
  },
  {
    icon: 'inventory_2',
    tinte: 'dorado',
    mensajes: [
      'El municipio deriva asistencia a comunidades de la zona.',
      'Se suma un nuevo recurso disponible para la red.',
    ],
  },
];

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  atendida: 'Atendida',
  rechazada: 'Rechazada',
  derivada: 'Derivada a otra entidad',
};

const MAX_ITEMS_RESUMEN = 4;

@Component({
  selector: 'app-inicio',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    HeroNetworkComponent,
  ],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);

  readonly currentUser = this.authService.currentUser;

  readonly misSolicitudes = signal<SolicitudMiaResumen[]>([]);
  readonly solicitudesRecibidas = signal<SolicitudRecibidaResumen[]>([]);
  readonly cargandoSolicitudes = signal(false);

  // Métricas de gestión del Municipio (ver cargarEstadisticasMunicipio):
  // salen de datos que el moderador ya puede pedir (su propia jurisdicción
  // y las solicitudes que recibió), no de un endpoint de stats nuevo.
  readonly comunidadesAsistidas = signal(0);
  readonly solicitudesPendientesMunicipio = signal(0);
  readonly ongsEnJurisdiccion = signal(0);
  readonly cargandoEstadisticasMunicipio = signal(false);

  // Cada latido tiene su propio mensaje/visibilidad: así cada tarjeta
  // rota su pool de mensajes de forma independiente (con delay
  // escalonado), en vez de que las tres cambien juntas como un slideshow.
  readonly latidos = LATIDOS.map((latido) => ({
    icon: latido.icon,
    tinte: latido.tinte,
    mensajes: latido.mensajes,
    mensajeActual: signal(latido.mensajes[0]),
    visible: signal(true),
  }));

  readonly latidosVisibles = signal(false);

  private readonly latidosSectionRef =
    viewChild<ElementRef<HTMLDivElement>>('latidosSection');

  private readonly seccionVisible = signal(false);
  private latidosIniciados = false;
  private intersectionObserver?: IntersectionObserver;
  private readonly intervalos: ReturnType<typeof setInterval>[] = [];

  // Modal de "Agradecer" sobre una solicitud atendida (ver abrirValoracion
  // más abajo): todavía no hay backend que persista el mensaje, así que
  // por ahora solo confirma el envío con un toast.
  readonly mostrarModalAgradecimiento = signal(false);
  readonly solicitudAAgradecer = signal<SolicitudMiaResumen | null>(null);
  readonly toastAgradecimiento = signal<string | null>(null);
  private toastAgradecimientoTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    // La sección de latidos entra por @if una vez inicializado el
    // componente, pero el elemento puede tardar un tick en existir: por
    // eso se observa con un signal query en vez de ViewChild clásico.
    effect(() => {
      const elemento = this.latidosSectionRef()?.nativeElement;

      if (!elemento || this.intersectionObserver) {
        return;
      }

      this.intersectionObserver = new IntersectionObserver(
        (entradas) => {
          if (entradas[0]?.isIntersecting) {
            this.seccionVisible.set(true);
            this.intersectionObserver?.disconnect();
          }
        },
        { threshold: 0.3 },
      );

      this.intersectionObserver.observe(elemento);
    });

    effect(() => {
      if (!this.seccionVisible() || this.latidosIniciados) {
        return;
      }

      this.latidosIniciados = true;
      this.latidosVisibles.set(true);
      this.iniciarCicloDeMensajes();
    });
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    this.intervalos.forEach((id) => clearInterval(id));
    clearTimeout(this.toastAgradecimientoTimeout);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.cerrarModalAgradecimiento();
  }

  // Cada tarjeta va y viene entre sus mensajes con un crossfade suave;
  // el delay escalonado por índice evita que las tres "respiren" al
  // unísono. Se respeta prefers-reduced-motion: sin eso, ni siquiera
  // arranca el ciclo (queda el primer mensaje fijo).
  private iniciarCicloDeMensajes(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.latidos.forEach((latido, i) => {
      let indice = 0;

      const intervalo = setInterval(() => {
        latido.visible.set(false);

        setTimeout(() => {
          indice = (indice + 1) % latido.mensajes.length;
          latido.mensajeActual.set(latido.mensajes[indice]);
          latido.visible.set(true);
        }, 400);
      }, 5200 + i * 1100);

      this.intervalos.push(intervalo);
    });
  }

  // Solo el moderador ofrece recursos institucionales sueltos (el municipio
  // no registra necesidades propias: eso depende de comunidades/ONGs, nunca
  // del municipio). Una comunidad/ong ya declaro en su registro todo lo que
  // ofrece (eso se refleja en su perfil/pin), no necesita ir cargando
  // recursos uno por uno; y un ciudadano (logueado o no) pide ayuda desde
  // el mapa.
  puedePublicar(): boolean {
    const rol = this.authService.currentUser()?.role;
    return rol === 'moderador';
  }

  esOrganizacion(): boolean {
    const rol = this.authService.currentUser()?.role;
    return rol === 'comunidad' || rol === 'ong';
  }

  // Distingue la sub-familia "ong" dentro de esOrganizacion(): la jerarquia
  // de los botones de accion rapida cambia segun cual sea (ver
  // dashboard-cta-fila en inicio.html).
  esOng(): boolean {
    return this.authService.currentUser()?.role === 'ong';
  }

  // El rol "ciudadano" no tiene un nombre propio en la base (el rol seed
  // se llama historicamente 'seed-role'): se define por descarte, igual
  // que puedePublicar()/esOrganizacion().
  esCiudadano(): boolean {
    const usuario = this.authService.currentUser();
    return !!usuario && !this.esOrganizacion() && usuario.role !== 'moderador';
  }

  esModerador(): boolean {
    return this.authService.currentUser()?.role === 'moderador';
  }

  nombreMostrado(): string {
    return this.authService.nombreParaMostrar();
  }

  iconoRolActual(): string {
    return this.authService.iconoRol();
  }

  etiquetaEstado(status: string): string {
    return ETIQUETA_ESTADO[status] ?? status;
  }

  formatearFechaSolicitud(fecha: string): string {
    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) {
      return fecha;
    }

    return date.toLocaleDateString('es-AR');
  }

  abrirValoracion(solicitud: SolicitudMiaResumen): void {
    this.solicitudAAgradecer.set(solicitud);
    this.mostrarModalAgradecimiento.set(true);
  }

  cerrarModalAgradecimiento(): void {
    if (!this.mostrarModalAgradecimiento()) {
      return;
    }
    this.mostrarModalAgradecimiento.set(false);
    this.solicitudAAgradecer.set(null);
  }

  // Cascarón a propósito: todavía no hay un endpoint de backend que
  // persista el agradecimiento. Por ahora solo cierra el modal y confirma
  // visualmente el envío con un toast; cuando exista el endpoint, este es
  // el único lugar que hay que tocar.
  enviarAgradecimiento(mensaje: string): void {
    this.cerrarModalAgradecimiento();
    this.mostrarToastAgradecimiento(
      mensaje.trim()
        ? 'Tu mensaje fue enviado. ¡Gracias por avisar!'
        : 'Gracias enviadas.',
    );
  }

  private mostrarToastAgradecimiento(mensaje: string): void {
    this.toastAgradecimiento.set(mensaje);
    clearTimeout(this.toastAgradecimientoTimeout);
    this.toastAgradecimientoTimeout = setTimeout(
      () => this.toastAgradecimiento.set(null),
      4000,
    );
  }

  // Una solicitud "directa" (pedido de ayuda a otra entidad, o derivacion
  // de un moderador atendiendo a alguien en persona) no tiene un recurso
  // puntual asociado: solo una categoria. Sin este fallback, el resumen
  // rompia al intentar leer el titulo de un recurso inexistente.
  tituloRecibida(solicitud: SolicitudRecibidaResumen): string {
    if (solicitud.resource) {
      return solicitud.resource.title;
    }

    return `Pedido de ayuda: ${solicitud.category?.name ?? ''}`;
  }

  // Si la solicitud declara un contactName (por ejemplo, el moderador
  // derivando a un tercero atendido en el municipio), ese es el nombre de
  // quien realmente necesita la ayuda, no el de la cuenta que la envio.
  subtituloRecibida(solicitud: SolicitudRecibidaResumen): string {
    return (
      solicitud.contactName ??
      `${solicitud.user.firstName} ${solicitud.user.lastName}`
    );
  }

  // Mismo caso que tituloRecibida/subtituloRecibida de arriba, pero para
  // las propias solicitudes del ciudadano: un pedido de ayuda directo (a
  // un municipio u ONG) tampoco tiene un recurso asociado.
  tituloMiSolicitud(solicitud: SolicitudMiaResumen): string {
    if (solicitud.resource) {
      return solicitud.resource.title;
    }

    return `Pedido de ayuda: ${solicitud.category?.name ?? ''}`;
  }

  organizacionMiSolicitud(solicitud: SolicitudMiaResumen): string | undefined {
    if (solicitud.resource) {
      return solicitud.resource.organizationName;
    }

    return solicitud.target?.organizationName;
  }

  ngOnInit(): void {
    const usuario = this.currentUser();

    if (!usuario) {
      return;
    }

    if (this.esCiudadano()) {
      this.cargandoSolicitudes.set(true);

      this.http
        .get<SolicitudMiaResumen[]>('/api/solicitudes/mias')
        .subscribe({
          next: (solicitudes) => {
            this.misSolicitudes.set(solicitudes.slice(0, MAX_ITEMS_RESUMEN));
            this.cargandoSolicitudes.set(false);
          },
          error: () => this.cargandoSolicitudes.set(false),
        });
      return;
    }

    if (usuario.role === 'comunidad' || usuario.role === 'ong') {
      this.cargandoSolicitudes.set(true);

      this.http
        .get<SolicitudRecibidaResumen[]>('/api/solicitudes/recibidas')
        .subscribe({
          next: (solicitudes) => {
            this.solicitudesRecibidas.set(
              solicitudes.slice(0, MAX_ITEMS_RESUMEN),
            );
            this.cargandoSolicitudes.set(false);
          },
          error: () => this.cargandoSolicitudes.set(false),
        });
      return;
    }

    if (usuario.role === 'moderador') {
      this.cargarEstadisticasMunicipio();
    }
  }

  // GET /api/users sin ?scope= trae, para un moderador, solo la propia
  // jurisdicción (ver users.controller.ts) — exactamente lo que hace falta
  // acá, a diferencia del mapa que pide toda la red. Se piden las
  // solicitudes recibidas completas (no el resumen de MAX_ITEMS_RESUMEN de
  // arriba) porque "pendientes" necesita el conteo real, no solo los
  // primeros 4.
  private cargarEstadisticasMunicipio(): void {
    this.cargandoEstadisticasMunicipio.set(true);

    forkJoin({
      organizaciones: this.http.get<{ id: number; role: { name: string } }[]>(
        '/api/users',
      ),
      recibidas: this.http.get<SolicitudRecibidaResumen[]>(
        '/api/solicitudes/recibidas',
      ),
    }).subscribe({
      next: ({ organizaciones, recibidas }) => {
        this.ongsEnJurisdiccion.set(
          organizaciones.filter((o) => o.role.name === 'ong').length,
        );

        this.solicitudesPendientesMunicipio.set(
          recibidas.filter((s) => s.status === 'pendiente').length,
        );

        // "Asistida" = al menos una vez el municipio le aprobó o atendió
        // una solicitud; una comunidad que solo tiene pedidos rechazados o
        // pendientes todavía no cuenta.
        const asistidas = new Set(
          recibidas
            .filter((s) => s.status === 'aprobada' || s.status === 'atendida')
            .map((s) => s.user.id),
        );
        this.comunidadesAsistidas.set(asistidas.size);

        this.cargandoEstadisticasMunicipio.set(false);
      },
      error: () => this.cargandoEstadisticasMunicipio.set(false),
    });
  }
}
