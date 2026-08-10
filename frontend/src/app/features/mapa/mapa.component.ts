import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
  inject,
  signal,
} from '@angular/core';

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import * as L from 'leaflet';

import { AuthService } from '../../core/services/auth.service';

type RolPublicador = 'ciudadano' | 'comunidad' | 'ong' | 'moderador';

// Mapea el role_id numerico que viene del backend al nombre de rol que
// necesitamos para decidir icono y visibilidad. Un id desconocido cae en
// 'ciudadano' para no ocultar datos por error.
const ROL_POR_ROLE_ID: Record<number, RolPublicador> = {
  1: 'ciudadano',
  2: 'moderador',
  4: 'comunidad',
  5: 'ong',
};

function rolPublicadorDesde(roleId: number | undefined): RolPublicador {
  return ROL_POR_ROLE_ID[roleId ?? -1] ?? 'ciudadano';
}

const CIUDADANO_ROLE_ID = 1;
const COMUNIDAD_ROLE_ID = 4;
const CORDOBA_COORDS = { lat: -31.4201, lng: -64.1888 };

const CATEGORIAS_AYUDA = [
  { id: 1, nombre: 'Salud' },
  { id: 2, nombre: 'Educación' },
  { id: 3, nombre: 'Alimentos' },
  { id: 4, nombre: 'Empleo' },
  { id: 5, nombre: 'Vivienda' },
  { id: 6, nombre: 'Asistencia comunitaria' },
];

interface Necesidad {
  id: number;
  usuario_id: number;
  categoria_id: number;
  titulo: string;
  descripcion: string;
  latitud: number;
  longitud: number;
  estado: string;
  fecha_creacion: string;
  rolPublicador: RolPublicador;
  contactName?: string;
  contactInfo?: string;
  resolvedAt?: string;
  recursosSugeridos: string[];
}

interface Recurso {
  id: number;
  usuario_id: number;
  categoria_id: number;
  titulo: string;
  descripcion: string;
  latitud: number;
  longitud: number;
  estado: string;
  fecha_creacion: string;
  rolPublicador: RolPublicador;
  contactInfo?: string;
  resolvedAt?: string;
  organizationName?: string;
  organizacionCiudad?: string;
  direccion?: string;
  horario?: string;
  categoriaNombre?: string;
}

// Alerta para el moderador: comunidades (de cualquier jurisdiccion, aunque
// en la practica solo pueden dirigirse a el las de su propia ciudad — ver
// findDirectorioAyuda en el backend) que le enviaron una solicitud PENDIENTE
// directamente a el. Reemplaza al viejo criterio de "estado critico"
// autodeclarado: ahora el pin rojo significa "me pidieron ayuda a mi", no
// "avisaron que la están pasando mal" sin más.
interface ComunidadConSolicitudPendiente {
  id: number;
  nombre: string;
  lat: number;
  lng: number;
}

// Capa pública para donantes (GET /users/comunidades-criticas-publico, sin
// login): a diferencia de ComunidadConSolicitudPendiente (que es privada,
// solo del moderador), acá lat/lng ya vienen redondeados por el backend a
// ~1km de precisión, y "necesita" sale de las categorías de sus propias
// necesidades activas, no de un campo propio.
interface ComunidadCriticaPublica {
  id: number;
  nombre: string;
  ciudad?: string;
  lat: number;
  lng: number;
  horario?: string;
  necesita: string[];
}

// Pin del perfil de una comunidad/ong (no de un recurso o necesidad
// puntual): así el moderador ve a toda la red en el mapa, incluso a
// quienes todavía no publicaron nada. enJurisdiccion marca si es de su
// propia ciudad, para priorizarla visualmente sobre el resto de la red.
// critico es el estado_ayuda autodeclarado de la comunidad — a diferencia
// del pin "urgent" (solicitud pendiente dirigida al moderador), este es
// el único lugar donde el moderador ve el estado crítico de su propia
// jurisdicción, ya que la capa pública para donantes se le oculta a él
// a propósito (ver cargarComunidadesCriticasPublico).
interface OrganizacionJurisdiccion {
  id: number;
  nombre: string;
  lat: number;
  lng: number;
  tipo: 'comunidad' | 'ong';
  enJurisdiccion: boolean;
  critico: boolean;
}

// Mismo endpoint que ya usa "Mis solicitudes" para armar el selector de
// "pedirle ayuda a" (GET /users/directorio-ayuda): para una comunidad
// logueada trae al Municipio de su propia jurisdicción + todas las ONGs
// aprobadas (a quienes SÍ le puede pedir recursos). Acá se reutiliza para
// ubicarlos en el mapa en vez de solo listarlos en un <select>.
interface DirectorioAyudaEntry {
  id: number;
  organizationName: string;
  ciudad?: string;
  role: 'moderador' | 'ong' | 'comunidad';
  latitude?: number;
  longitude?: number;
}

// Recorte minimo de GET /api/solicitudes/recibidas: acá solo importa quién
// mandó la solicitud y si sigue activa, para la regla de color de una ONG
// en el mapa (ver cargarSolicitudesRecibidasParaMapa()).
interface SolicitudRecibidaMapa {
  status: string;
  user: { id: number };
}

// Recorte de GET /api/solicitudes/recibidas con lo necesario para ubicar en
// el mapa a la comunidad que la mandó (ver cargarComunidadesConSolicitudPendiente,
// usado solo por el Municipio).
interface SolicitudRecibidaConUbicacion {
  status: string;
  user: {
    id: number;
    roleId?: number;
    organizationName?: string;
    latitude?: number;
    longitude?: number;
  };
}

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [MatCardModule, NgClass, RouterLink],
  encapsulation: ViewEncapsulation.None,
  template: `
    <mat-card class="map-card">
      @if (mostrarEncabezado) {
        <header class="map-header">
          <h2 class="map-title">{{ mapSubtitle() }}</h2>

          <div
            class="map-legend"
            aria-label="Referencias del mapa"
          >
            <span class="legend-item">
              <span
                class="legend-color legend-color--need"
                aria-hidden="true"
              ></span>

              Comunidades buscando apoyo
            </span>

            <span class="legend-item">
              <span
                class="legend-color legend-color--resource"
                aria-hidden="true"
              ></span>

              Recursos y contención disponibles
            </span>

            @if (mostrarLeyendaJurisdiccion()) {
            <span class="legend-item">
              <span
                class="legend-color legend-color--urgent"
                aria-hidden="true"
              ></span>

              {{ etiquetaPrioritarias() }}
            </span>
            }

            @if (esOng()) {
            <span class="legend-item">
              <span
                class="legend-color legend-color--contexto"
                aria-hidden="true"
              ></span>

              Otras necesidades de la zona (no dirigidas a vos)
            </span>
            }

            @if (mostrarLeyendaCritico()) {
            <span class="legend-item">
              <span
                class="legend-color legend-color--urgent"
                aria-hidden="true"
              ></span>

              Te pidieron ayuda directamente
            </span>
            }

            @if (mostrarLeyendaOrganizaciones()) {
            <span class="legend-item">
              <span
                class="legend-color legend-color--resource"
                aria-hidden="true"
              ></span>

              Comunidades y ONGs de tu jurisdicción
            </span>

            <span class="legend-item">
              <span
                class="legend-color legend-color--resource legend-color--atenuado"
                aria-hidden="true"
              ></span>

              Del resto de la red (fuera de tu jurisdicción)
            </span>
            }

            @if (mostrarLeyendaMunicipioDirectorio()) {
            <span class="legend-item">
              <span
                class="legend-color legend-color--municipio"
                aria-hidden="true"
              ></span>

              Municipio de tu jurisdicción
            </span>
            }

            @if (mostrarLeyendaDirectorioAyuda()) {
            <span class="legend-item">
              <span
                class="legend-color legend-color--resource"
                aria-hidden="true"
              ></span>

              ONGs a las que podés pedirles recursos
            </span>
            }

            @if (!esModerador()) {
              <button
                type="button"
                class="legend-item legend-item--filtro"
                [class.legend-item--inactivo]="!mostrarCapaDonar()"
                (click)="toggleCapaDonar()"
                [attr.aria-pressed]="mostrarCapaDonar()"
              >
                <span
                  class="legend-color legend-color--donar"
                  aria-hidden="true"
                ></span>

                Quiero Donar / Ayudar
              </button>
            }
          </div>
        </header>
      }

      @if (!esModerador() && !tengoUbicacion()) {
        <div class="usar-ubicacion">
          @if (obteniendoUbicacion()) {
            <p class="ubicacion-hint ubicacion-hint--neutral">
              <span class="ubicacion-hint-spinner" aria-hidden="true"></span>
              Buscando tu ubicación...
            </p>
          } @else {
            <button
              type="button"
              class="usar-ubicacion-btn"
              (click)="usarMiUbicacion()"
            >
              📍 Usar mi ubicación actual
            </button>
          }
        </div>
      }

      @if (toastUbicacion(); as mensaje) {
        <p class="toast-ubicacion" role="alert">{{ mensaje }}</p>
      }

      @if (esModerador()) {
        <div class="ayuda-cta">
          <a
            class="solicitud-btn solicitud-btn--primary ayuda-cta-toggle"
            routerLink="/mis-solicitudes"
          >
            ¿Atendés a alguien en el municipio? Derivalo a una comunidad u ONG
          </a>
        </div>
      } @else {
        <div class="ayuda-cta">
          <button
            type="button"
            class="solicitud-btn solicitud-btn--primary ayuda-cta-toggle"
            (click)="mostrarSelectorAyuda.set(!mostrarSelectorAyuda())"
          >
            {{ mostrarSelectorAyuda() ? 'Ocultar tipos de ayuda' : '¿Necesitás ayuda? Solicitar ayuda' }}
          </button>

          @if (mostrarSelectorAyuda()) {
            <div class="categorias-ayuda">
              <p class="categorias-ayuda-label">Filtrar por tipo de ayuda</p>

              <div class="categorias-ayuda-grid">
                @for (categoria of categoriasAyuda; track categoria.id) {
                  <button
                    type="button"
                    class="categoria-btn"
                    [ngClass]="categoriaActiva(categoria.id) ? 'categoria-btn--activo' : 'categoria-btn--inactivo'"
                    [attr.aria-pressed]="categoriaActiva(categoria.id)"
                    (click)="toggleCategoriaActiva(categoria.id)"
                  >
                    {{ categoria.nombre }}
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }

      @if (!esModerador() && ayudaCercana(); as cercana) {
        <div class="ayuda-cercana-banner">
          <span class="ayuda-cercana-icon" aria-hidden="true">📍</span>

          <div class="ayuda-cercana-texto">
            <strong>Ayuda más cercana a vos:</strong>
            {{ cercana.titulo }}
            @if (cercana.organizationName) {
              · {{ cercana.organizationName }}
            }
            · a {{ cercana.distanciaKm }} km
          </div>

          <button
            type="button"
            class="solicitud-btn solicitud-btn--primary"
            (click)="irAAyudaMasCercana()"
          >
            Ver en el mapa
          </button>
        </div>
      }

      <div class="map-content">
        <div
          #mapContainer
          class="map-container"
          aria-label="Mapa social interactivo"
        ></div>

        @if (cargandoDatos()) {
          <div class="map-loading-overlay">
            <div class="map-loading-spinner" aria-hidden="true"></div>
            <p>Cargando el mapa...</p>
          </div>
        }
      </div>

      @if (solicitudSeleccion().length > 0) {
        <div class="solicitud-bar">
          <span>Mi solicitud ({{ solicitudSeleccion().length }})</span>

          <div class="solicitud-bar-actions">
            <button
              type="button"
              class="solicitud-btn solicitud-btn--ghost"
              (click)="limpiarSeleccion()"
            >
              Vaciar
            </button>

            <button
              type="button"
              class="solicitud-btn solicitud-btn--primary"
              (click)="mostrarFormularioSolicitud.set(true)"
            >
              Confirmar solicitud
            </button>
          </div>
        </div>
      }
    </mat-card>

    @if (mostrarFormularioSolicitud()) {
      <div
        class="solicitud-modal-backdrop"
        (click)="cerrarFormularioSolicitud()"
      >
        <div class="solicitud-modal" (click)="$event.stopPropagation()">
          <h2>Confirmar solicitud</h2>

          <p>Vas a solicitar:</p>

          <ul class="solicitud-lista">
            @for (item of solicitudSeleccion(); track item.id) {
              <li>{{ item.titulo }}</li>
            }
          </ul>

          <label class="solicitud-label">
            Nombre de contacto
            <input #contactNameInput type="text" placeholder="Tu nombre" />
          </label>

          <label class="solicitud-label">
            Teléfono o email de contacto
            <input #contactInfoInput type="text" placeholder="Cómo te contactamos" />
          </label>

          <p class="solicitud-hint">
            Si no tenés un teléfono o email propio y seguro (por ejemplo,
            pediste ayuda desde el celular de otra persona), dejanos al menos
            una dirección para poder visitarte.
          </p>

          <label class="solicitud-label">
            Dirección o punto de referencia
            <input #addressInput type="text" placeholder="Ej: Plaza San Martín, banco frente a la fuente" />
          </label>

          @if (solicitudError()) {
            <p class="form-message error-message">{{ solicitudError() }}</p>
          }

          @if (solicitudMensaje()) {
            <p class="form-message success-message">{{ solicitudMensaje() }}</p>
          }

          <div class="solicitud-modal-actions">
            <button
              type="button"
              class="solicitud-btn solicitud-btn--ghost"
              (click)="cerrarFormularioSolicitud()"
            >
              Cancelar
            </button>

            <button
              type="button"
              class="solicitud-btn solicitud-btn--primary"
              [disabled]="solicitudEnviando()"
              (click)="enviarSolicitud(contactNameInput.value, contactInfoInput.value, addressInput.value)"
            >
              {{ solicitudEnviando() ? 'Enviando...' : 'Enviar solicitud' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (mostrarFormularioInvitado()) {
      <div
        class="solicitud-modal-backdrop"
        (click)="cerrarFormularioInvitado()"
      >
        <div class="solicitud-modal" (click)="$event.stopPropagation()">
          <h2>Registrate para pedir ayuda</h2>

          <p>Vas a pedir: <strong>{{ invitadoRecursoTitulo() }}</strong></p>

          <p class="solicitud-hint">
            Completá tus datos para crear tu cuenta de usuario común. Con
            ella vas a poder seguir el estado de tu pedido.
          </p>

          <label class="solicitud-label">
            Nombre
            <input #invNombre type="text" placeholder="Tu nombre" />
          </label>

          <label class="solicitud-label">
            Apellido
            <input #invApellido type="text" placeholder="Tu apellido" />
          </label>

          <label class="solicitud-label">
            Dirección
            <input
              #invDireccion
              type="text"
              placeholder="Calle, número y localidad"
            />
          </label>

          <label class="solicitud-label">
            Correo electrónico
            <input #invEmail type="email" placeholder="tu@correo.com" />
          </label>

          <label class="solicitud-label">
            Género
            <select #invGenero>
              <option value="" disabled selected>Seleccioná una opción</option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
              <option value="no_binario">No binario</option>
              <option value="prefiero_no_decir">Prefiero no decir</option>
            </select>
          </label>

          <label class="solicitud-label">
            Teléfono
            <input #invTelefono type="text" placeholder="Para que te contacten" />
          </label>

          <label class="solicitud-label">
            Creá una contraseña
            <input #invPassword type="password" placeholder="Mínimo 6 caracteres" />
          </label>

          @if (invitadoError()) {
            <p class="form-message error-message">{{ invitadoError() }}</p>
          }

          @if (invitadoMensaje()) {
            <p class="form-message success-message">{{ invitadoMensaje() }}</p>
          }

          <div class="solicitud-modal-actions">
            <button
              type="button"
              class="solicitud-btn solicitud-btn--ghost"
              (click)="cerrarFormularioInvitado()"
            >
              Cancelar
            </button>

            <button
              type="button"
              class="solicitud-btn solicitud-btn--primary"
              [disabled]="invitadoEnviando()"
              (click)="crearCuentaYSolicitar(invNombre.value, invApellido.value, invDireccion.value, invEmail.value, invGenero.value, invTelefono.value, invPassword.value)"
            >
              {{ invitadoEnviando() ? 'Enviando...' : 'Crear cuenta y enviar solicitud' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      app-mapa {
        display: block;
        padding: 24px;
      }

      app-mapa .map-card {
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        border: 1px solid rgb(76 139 94 / 28%);
        border-radius: 12px;
        background-color: var(--color-primary);
        box-shadow: 0 8px 22px rgb(143 58 45 / 14%);
        transition:
          border-color 180ms ease,
          box-shadow 180ms ease;
      }

      app-mapa .map-card:hover {
        border-color: rgb(217 140 43 / 45%);
        box-shadow: 0 10px 24px rgb(143 58 45 / 18%);
      }

      app-mapa .map-header {
        padding: 18px 18px 14px;
        background-color: var(--color-primary);
      }

      // .map-title era antes un subtítulo (había un <h1> "Corazones
      // Unidos" arriba, ya redundante con el navbar). Ahora es el único
      // título del panel, así que sube de peso/tamaño para que se lea
      // como tal.
      app-mapa .map-title {
        margin: 0;
        color: #ffffff !important;
        font-family: Roboto, "Helvetica Neue", sans-serif;
        font-size: 1.3rem;
        font-weight: 600;
        line-height: 1.3;
      }

      app-mapa .map-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        margin-top: 12px;
      }

      app-mapa .legend-item {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 0;
        border: 0;
        background: transparent;
        color: #ffffff !important;
        font-family: Roboto, "Helvetica Neue", sans-serif;
        font-size: 0.88rem;
        font-weight: 500;
        line-height: 1;
      }

      app-mapa .legend-color {
        width: 10px;
        height: 10px;
        flex: 0 0 10px;
        border-radius: 50%;
      }

      app-mapa .legend-color--need {
        background-color: var(--color-accent);
      }

      app-mapa .legend-color--resource {
        background-color: var(--color-secondary);
      }

      app-mapa .legend-color--urgent {
        background-color: var(--color-primary);
      }

      app-mapa .legend-color--donar {
        background-color: #e0b93a;
      }

      app-mapa .legend-color--municipio {
        background-color: #355070;
      }

      app-mapa .legend-color--contexto {
        background-color: var(--color-text-secondary);
      }

      app-mapa .legend-color--atenuado {
        opacity: 0.5;
      }

      app-mapa .legend-item--filtro {
        cursor: pointer;
        opacity: 1;
        transition: opacity 160ms ease;
      }

      app-mapa .legend-item--filtro:hover {
        opacity: 0.8;
      }

      app-mapa .legend-item--inactivo {
        opacity: 0.5;
      }

      app-mapa .legend-item--inactivo .legend-color--donar {
        background-color: transparent;
        border: 1.5px solid #e0b93a;
      }

      app-mapa .map-content {
        position: relative;
        padding: 0 16px 16px;
        background-color: var(--color-primary);
      }

      app-mapa .map-loading-overlay {
        position: absolute;
        top: 0;
        right: 16px;
        bottom: 16px;
        left: 16px;
        z-index: 500;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        background-color: var(--color-primary);
        border-radius: 8px;
      }

      app-mapa .map-loading-overlay p {
        margin: 0;
        color: #ffffff !important;
        font-family: Roboto, "Helvetica Neue", sans-serif;
        font-size: 0.92rem;
        opacity: 0.85;
      }

      app-mapa .map-loading-spinner {
        width: 36px;
        height: 36px;
        border: 3px solid rgb(255 255 255 / 25%);
        border-top-color: var(--color-accent);
        border-radius: 50%;
        animation: app-mapa-girar 800ms linear infinite;
      }

      @keyframes app-mapa-girar {
        to {
          transform: rotate(360deg);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        app-mapa .map-loading-spinner {
          animation: none;
        }
      }

      app-mapa .map-container {
        width: 100%;
        height: 600px;
        min-height: 400px;
        overflow: hidden;
        border: 1px solid rgb(76 139 94 / 38%);
        border-radius: 8px;
        background-color: var(--color-primary);
        transition:
          border-color 180ms ease,
          box-shadow 180ms ease;
      }

      app-mapa .map-container:hover {
        border-color: rgb(217 140 43 / 55%);
        box-shadow: 0 0 0 2px rgb(217 140 43 / 10%);
      }

      app-mapa .warm-map-tiles {
        filter:
          sepia(0.35)
          hue-rotate(-6deg)
          saturate(0.9)
          brightness(1.03)
          contrast(1.02);
      }

      app-mapa .leaflet-control-zoom {
        overflow: hidden;
        border: 0 !important;
        border-radius: 6px !important;
        box-shadow: 0 3px 10px rgb(143 58 45 / 22%) !important;
      }

      app-mapa .leaflet-control-zoom a {
        display: grid;
        width: 32px;
        height: 32px;
        place-items: center;
        border: 0 !important;
        background-color: rgb(143 58 45 / 94%);
        color: #ffffff !important;
        font-size: 18px;
        font-weight: 400;
        line-height: 32px;
        transition:
          background-color 180ms ease,
          color 180ms ease;
      }

      app-mapa .leaflet-control-zoom a:first-child {
        border-bottom:
          1px solid rgb(255 255 255 / 14%) !important;
      }

      app-mapa .leaflet-control-zoom a:hover {
        background-color: var(--color-accent);
        color: #ffffff !important;
      }

      app-mapa .leaflet-control-zoom a.leaflet-disabled {
        background-color: rgb(143 58 45 / 65%);
        color: rgb(255 255 255 / 45%) !important;
      }

      app-mapa .leaflet-popup-content-wrapper {
        border-top: 3px solid var(--color-secondary);
        border-radius: 9px;
        background-color: var(--color-primary);
        color: #ffffff;
      }

      app-mapa .leaflet-popup-tip {
        background-color: var(--color-primary);
      }

      app-mapa .leaflet-popup-content {
        line-height: 1.5;
      }

      app-mapa .leaflet-popup-content strong:first-child {
        color: var(--color-accent);
      }

      app-mapa .leaflet-control-attribution {
        padding: 2px 5px;
        background-color: rgb(143 58 45 / 78%) !important;
        color: rgb(255 255 255 / 78%) !important;
        font-size: 10px;
      }

      app-mapa .leaflet-control-attribution a {
        color: #f0c9a0 !important;
      }

      .map-pin {
        position: relative;
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgb(0 0 0 / 40%);
      }

      .map-pin--red {
        background-color: var(--color-accent);
      }

      .map-pin--blue {
        background-color: var(--color-secondary);
      }

      .map-pin--urgent {
        background-color: var(--color-primary);
      }

      // Para el mapa de una ONG: una necesidad que NO esta dirigida a ella
      // (no tiene una solicitud activa apuntandole) se atenua a este gris
      // calido en vez de usar el naranja de alerta (.map-pin--red), para
      // que no compita visualmente con las que si le corresponden.
      .map-pin--contexto {
        background-color: var(--color-text-secondary);
      }

      // Para el mapa del Municipio: una organizacion que NO es de su propia
      // jurisdiccion conserva su color base (a proposito, ver la regla de
      // "conservar colores base" en initializeMap), solo se atenua un poco
      // para que las de su propia ciudad prioricen visualmente.
      .map-pin--atenuado {
        opacity: 0.55;
      }

      // Capa "Quiero Donar / Ayudar": amarillo/dorado — a propósito NO es
      // --color-accent, porque ese es el color que YA usan los pines de
      // necesidad (.map-pin--red, pese al nombre de la clase). Con el
      // mismo tono se confundirían con una necesidad puntual en vez de
      // leerse como su propia categoría.
      .map-pin--donar {
        background-color: #e0b93a;
      }

      // Deliberadamente fuera de la paleta calida (terracota/verde/dorado)
      // que usa el resto de los pines: el Municipio es una entidad de
      // gobierno, no una organizacion comunitaria mas, y una comunidad
      // necesita distinguirlo de un vistazo entre sus ONGs. Tambien es mas
      // grande que el resto (34px -> 40px): pisa el tamano fijo de
      // .map-pin a proposito, junto con iconSize/iconAnchor en
      // crearIconoMunicipio().
      .map-pin--municipio {
        width: 40px;
        height: 40px;
        background-color: #355070;
      }

      .map-pin--municipio .pin-icon-bank {
        width: 22px;
        height: 22px;
      }

      .map-pin .pin-icon-house,
      .map-pin .pin-icon-person,
      .map-pin .pin-icon-building,
      .map-pin .pin-icon-bank {
        display: block;
        width: 18px;
        height: 18px;
        transform: rotate(45deg);
      }

      .map-pin .pin-icon-house svg,
      .map-pin .pin-icon-person svg,
      .map-pin .pin-icon-building svg,
      .map-pin .pin-icon-bank svg {
        width: 100%;
        height: 100%;
        fill: #ffffff;
      }

      .map-pin .pin-icon-heart {
        position: absolute;
        bottom: -3px;
        right: -3px;
        width: 15px;
        height: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: #ffffff;
        transform: rotate(45deg);
        box-shadow: 0 1px 2px rgb(0 0 0 / 40%);
      }

      .map-pin .pin-icon-heart svg {
        width: 11px;
        height: 11px;
        fill: #c0392b;
      }

      .mi-ubicacion-marcador {
        position: relative;
        width: 22px;
        height: 22px;
      }

      .mi-ubicacion-punto {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 14px;
        height: 14px;
        background-color: #4285f4;
        border: 2px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgb(0 0 0 / 45%);
        transform: translate(-50%, -50%);
      }

      .mi-ubicacion-halo {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 22px;
        height: 22px;
        background-color: rgb(66 133 244 / 35%);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: mi-ubicacion-pulso 2s ease-out infinite;
      }

      @keyframes mi-ubicacion-pulso {
        0% {
          transform: translate(-50%, -50%) scale(0.6);
          opacity: 0.9;
        }
        100% {
          transform: translate(-50%, -50%) scale(2.2);
          opacity: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .mi-ubicacion-halo {
          animation: none;
          opacity: 0.5;
        }
      }

      app-mapa .ubicacion-hint {
        margin: 0;
        padding: 10px 18px;
        background-color: var(--color-primary);
        color: #f9ebdd;
        font-size: 0.82rem;
      }

      app-mapa .ubicacion-hint--neutral {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        background-color: rgb(255 255 255 / 10%);
      }

      app-mapa .ubicacion-hint-spinner {
        width: 13px;
        height: 13px;
        flex: 0 0 auto;
        border: 2px solid rgb(255 255 255 / 30%);
        border-top-color: #f9ebdd;
        border-radius: 50%;
        animation: app-mapa-girar 800ms linear infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        app-mapa .ubicacion-hint-spinner {
          animation: none;
        }
      }

      app-mapa .usar-ubicacion {
        padding: 10px 18px;
        background-color: var(--color-primary);
      }

      app-mapa .usar-ubicacion-btn {
        width: 100%;
        padding: 8px 16px;
        color: #ffffff;
        font: inherit;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        background-color: rgb(255 255 255 / 14%);
        border: 1px solid rgb(255 255 255 / 30%);
        border-radius: 999px;
        transition:
          background-color 160ms ease,
          border-color 160ms ease;
      }

      app-mapa .usar-ubicacion-btn:hover {
        background-color: var(--color-accent);
        border-color: var(--color-accent);
      }

      @media (min-width: 560px) {
        app-mapa .usar-ubicacion-btn {
          width: auto;
        }
      }

      // Toast transitorio (se autodescarta a los 5s, ver
      // mostrarToastUbicacion()): a diferencia del banner de antes, solo
      // aparece después de un intento fallido real, no de entrada.
      app-mapa .toast-ubicacion {
        margin: 0;
        padding: 10px 18px;
        background-color: rgb(230 95 50 / 16%);
        border-bottom: 1px solid rgb(230 95 50 / 30%);
        color: #8a2a1f;
        font-size: 0.82rem;
        animation: app-mapa-toast-entrada 200ms ease;
      }

      @keyframes app-mapa-toast-entrada {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      app-mapa .ayuda-cta {
        padding: 16px 18px 20px;
        background-color: var(--color-primary);
      }

      app-mapa .ayuda-cta-toggle {
        width: 100%;
      }

      @media (min-width: 560px) {
        app-mapa .ayuda-cta-toggle {
          width: auto;
        }
      }

      app-mapa .categorias-ayuda {
        margin-top: 14px;
        padding: 14px 16px;
        border-radius: 10px;
        background-color: rgb(255 255 255 / 8%);
      }

      app-mapa .categorias-ayuda-label {
        margin: 0 0 10px;
        color: #ffffff;
        font-family: Roboto, "Helvetica Neue", sans-serif;
        font-size: 0.9rem;
        font-weight: 600;
      }

      app-mapa .categorias-ayuda-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      // Base compartida por los dos estados (toggle de filtro por
      // categoría, ver categoriaActiva()/toggleCategoriaActiva()): el
      // color sale de los modificadores de abajo, no de acá.
      app-mapa .categoria-btn {
        padding: 8px 14px;
        border-radius: 999px;
        font-family: Roboto, "Helvetica Neue", sans-serif;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition:
          background-color 150ms ease,
          border-color 150ms ease,
          color 150ms ease;
      }

      // Inactiva: outline, más clara — invita a activarla.
      app-mapa .categoria-btn--inactivo {
        background-color: transparent;
        border: 1px solid rgb(255 255 255 / 35%);
        color: #ffffff;
      }

      app-mapa .categoria-btn--inactivo:hover {
        border-color: var(--color-accent);
        background-color: rgb(255 255 255 / 12%);
      }

      // Activa: relleno sólido, más oscura — ya está filtrando el mapa.
      app-mapa .categoria-btn--activo {
        background-color: var(--color-accent);
        border: 1px solid var(--color-accent);
        color: #ffffff;
      }

      app-mapa .categoria-btn--activo:hover {
        background-color: #b8721f;
        border-color: #b8721f;
      }

      app-mapa .ayuda-cercana-banner {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px 14px;
        padding: 12px 18px;
        background-color: var(--color-secondary);
        color: #ffffff;
      }

      app-mapa .ayuda-cercana-icon {
        font-size: 1.2rem;
        line-height: 1;
      }

      app-mapa .ayuda-cercana-texto {
        flex: 1 1 240px;
        font-family: Roboto, "Helvetica Neue", sans-serif;
        font-size: 0.9rem;
        line-height: 1.4;
      }

      app-mapa .ayuda-cercana-banner .solicitud-btn--primary {
        flex: 0 0 auto;
        background-color: var(--color-accent);
        color: #ffffff;
      }

      .solicitud-hint {
        margin: 0 0 16px;
        color: var(--color-text-secondary, #7a6155);
        font-size: 0.82rem;
      }

      app-mapa .popup-solicitar-btn {
        margin-top: 8px;
        padding: 6px 14px;
        border: 0;
        border-radius: 999px;
        background-color: var(--color-accent);
        color: #ffffff;
        font-family: Roboto, "Helvetica Neue", sans-serif;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
      }

      app-mapa .solicitud-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 0 16px 16px;
        padding: 12px 16px;
        border-radius: 8px;
        background-color: var(--color-secondary);
        color: #ffffff;
        font-family: Roboto, "Helvetica Neue", sans-serif;
        font-weight: 600;
      }

      app-mapa .solicitud-bar-actions {
        display: flex;
        gap: 8px;
      }

      .solicitud-btn {
        display: inline-block;
        padding: 8px 16px;
        border: 0;
        border-radius: 6px;
        font-family: Roboto, "Helvetica Neue", sans-serif;
        font-weight: 600;
        font-size: 0.88rem;
        text-align: center;
        text-decoration: none;
        cursor: pointer;
        transition: opacity 150ms ease;
        box-sizing: border-box;
      }

      .solicitud-btn:hover {
        opacity: 0.88;
      }

      .solicitud-btn:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .solicitud-btn--primary {
        background-color: var(--color-accent);
        color: #ffffff;
      }

      .solicitud-btn--ghost {
        background-color: rgb(255 255 255 / 18%);
        color: #ffffff;
      }

      .solicitud-modal-backdrop {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgb(143 58 45 / 55%);
        z-index: 3000;
      }

      .solicitud-modal {
        width: min(420px, 92vw);
        max-height: 90vh;
        padding: 24px;
        border-radius: 12px;
        background-color: var(--color-surface, #ffffff);
        box-shadow: 0 12px 32px rgb(0 0 0 / 30%);
        overflow-y: auto;
        box-sizing: border-box;
      }

      .solicitud-modal h2 {
        margin: 0 0 8px;
        color: var(--color-primary);
        font-family: Roboto, "Helvetica Neue", sans-serif;
      }

      .solicitud-lista {
        margin: 0 0 16px;
        padding-left: 20px;
        color: var(--color-text-secondary, #7a6155);
      }

      .solicitud-label {
        display: block;
        margin-bottom: 12px;
        color: var(--color-text-secondary, #7a6155);
        font-family: Roboto, "Helvetica Neue", sans-serif;
        font-size: 0.85rem;
        font-weight: 500;
      }

      .solicitud-label input,
      .solicitud-label select {
        display: block;
        width: 100%;
        margin-top: 4px;
        padding: 8px 10px;
        box-sizing: border-box;
        border: 1px solid var(--color-border, #ddc3ab);
        border-radius: 6px;
        font-size: 0.95rem;
        font-family: inherit;
        background-color: var(--color-surface, #ffffff);
        color: var(--color-text, #5a3226);
      }

      .solicitud-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 8px;
      }

      .form-message {
        margin: 4px 0;
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 500;
      }

      .success-message {
        background-color: rgba(47, 131, 168, 0.14);
        color: var(--color-primary);
      }

      .error-message {
        background-color: rgba(230, 95, 50, 0.14);
        color: #8a2a1f;
      }

      .popup-solicitar {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        font-weight: 600;
        cursor: pointer;
      }

      @media (max-width: 768px) {
        app-mapa {
          padding: 12px;
        }

        app-mapa .map-header {
          padding: 16px 14px 12px;
        }

        app-mapa .map-content {
          padding: 0 12px 12px;
        }

        app-mapa .map-container {
          height: 70vh;
          min-height: 350px;
        }

        app-mapa .map-legend {
          gap: 14px;
        }
      }
    `,
  ],
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);

  @Input() mostrarEncabezado = true;

  @ViewChild('mapContainer', { static: true })
  private mapContainer!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private readonly resourceMarkers = new Map<number, L.Marker>();

  private readonly houseIconSvg = `
    <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
  `;

  private readonly heartIconSvg = `
    <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
  `;

  private readonly personIconSvg = `
    <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
  `;

  private readonly buildingIconSvg = `
    <svg viewBox="0 0 24 24"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>
  `;

  // Edificio con columnas (estilo casa de gobierno), a proposito distinto
  // del "buildingIconSvg" generico de ONG: una comunidad necesita
  // reconocer al Municipio de un vistazo, no confundirlo con una ONG mas.
  private readonly bankIconSvg = `
    <svg viewBox="0 0 24 24">
      <polygon points="12,2 22,8 2,8" />
      <rect x="4" y="9" width="2" height="9" />
      <rect x="8" y="9" width="2" height="9" />
      <rect x="14" y="9" width="2" height="9" />
      <rect x="18" y="9" width="2" height="9" />
      <rect x="2" y="19" width="20" height="2" />
    </svg>
  `;

  // ONG = edificio (institucion), comunidad = casita (centro barrial). El
  // moderador (municipio) tambien usa el edificio cuando publica un recurso
  // propio, ya que institucionalmente se parece mas a una ONG que a un
  // comedor o club barrial.
  private crearIconoOrganizacion(
    color: 'red' | 'blue' | 'urgent' | 'donar' | 'contexto',
    tipo: RolPublicador,
    atenuado = false,
  ): L.DivIcon {
    const iconoTipo =
      tipo === 'comunidad'
        ? `<span class="pin-icon-house">${this.houseIconSvg}</span>`
        : `<span class="pin-icon-building">${this.buildingIconSvg}</span>`;

    return L.divIcon({
      className: '',
      html: `
        <div class="map-pin map-pin--${color}${atenuado ? ' map-pin--atenuado' : ''}">
          ${iconoTipo}
          <span class="pin-icon-heart">${this.heartIconSvg}</span>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 30],
      popupAnchor: [0, -30],
    });
  }

  // Pin del Municipio de la jurisdicción de una comunidad: más grande,
  // color propio (fuera de la paleta cálida a propósito, para que se lea
  // como "entidad de gobierno") e icono de edificio con columnas en vez
  // del genérico de ONG. Ver cargarDirectorioAyuda().
  private crearIconoMunicipio(): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `
        <div class="map-pin map-pin--municipio">
          <span class="pin-icon-bank">${this.bankIconSvg}</span>
          <span class="pin-icon-heart">${this.heartIconSvg}</span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 35],
      popupAnchor: [0, -35],
    });
  }

  private crearIconoPersona(color: 'red' | 'urgent' | 'contexto' = 'red'): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `
        <div class="map-pin map-pin--${color}">
          <span class="pin-icon-person">${this.personIconSvg}</span>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 30],
      popupAnchor: [0, -30],
    });
  }

  // "Vos estas acá": el clasico punto azul con halo pulsante (mismo lenguaje
  // visual que Google Maps), distinto de los pines de necesidad/recurso
  // para que no se confunda con una publicacion.
  private crearIconoMiUbicacion(): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `
        <div class="mi-ubicacion-marcador">
          <span class="mi-ubicacion-halo"></span>
          <span class="mi-ubicacion-punto"></span>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -14],
    });
  }

  readonly mapSubtitle = signal(
    'Descubrí ONGs y comunidades activas en tu zona',
  );

  readonly solicitudSeleccion = signal<{ id: number; titulo: string }[]>([]);
  readonly mostrarFormularioSolicitud = signal(false);
  readonly solicitudEnviando = signal(false);
  readonly solicitudMensaje = signal('');
  readonly solicitudError = signal('');

  private necesidades: Necesidad[] = [];
  private recursos: Recurso[] = [];
  private comunidadesConSolicitudPendiente: ComunidadConSolicitudPendiente[] = [];
  private organizacionesJurisdiccion: OrganizacionJurisdiccion[] = [];
  private comunidadesCriticasPublico: ComunidadCriticaPublica[] = [];
  private donarMarkers: L.Marker[] = [];
  private directorioAyuda: DirectorioAyudaEntry[] = [];
  private usuariosConSolicitudActivaHaciaMi = new Set<number>();

  // Filtro real (no solo un ítem de leyenda pasivo): controla si la capa
  // "Quiero Donar / Ayudar" se ve en el mapa. Arranca visible.
  readonly mostrarCapaDonar = signal(true);

  toggleCapaDonar(): void {
    this.mostrarCapaDonar.update((valor) => !valor);
    const visible = this.mostrarCapaDonar();

    this.donarMarkers.forEach((marker) => {
      if (visible) {
        marker.addTo(this.map!);
      } else {
        this.map?.removeLayer(marker);
      }
    });
  }

  // Ubicacion real del dispositivo (ver obtenerUbicacionReal): solo se
  // completa para quien no es moderador, y solo si el navegador la pudo
  // obtener. Se usa para el pin de "vos estas acá" y para mostrar a cuantos
  // km esta cada recurso.
  private miUbicacion?: { lat: number; lng: number };

  // La geolocalización ya no se pide sola al entrar al mapa: solo se
  // dispara cuando el usuario toca "Usar mi ubicación actual"
  // (usarMiUbicacion()). Mientras está pendiente, el botón se reemplaza
  // por un spinner; si falla, se avisa con un toast transitorio en vez
  // de un banner que se queda pegado en pantalla.
  readonly obteniendoUbicacion = signal(false);
  readonly tengoUbicacion = signal(false);
  readonly toastUbicacion = signal<string | null>(null);
  private toastUbicacionTimeoutId?: ReturnType<typeof setTimeout>;

  // true mientras se cargan needs/resources del backend. El mapa (con
  // todos sus pines) no arranca a dibujarse hasta que esto termina, así
  // que la plantilla muestra un loader en vez de dejar el contenedor
  // vacío y sin explicación.
  readonly cargandoDatos = signal(true);

  // Una sola promesa de geolocalización compartida por todo el
  // componente: calcularAyudaMasCercana() y el marcador "vos estás acá"
  // reusan el mismo resultado en vez de volver a pedirle GPS/permiso al
  // dispositivo cada vez.
  private ubicacionRealPromise?: Promise<{ lat: number; lng: number } | null>;

  private estaSeleccionado(id: number): boolean {
    return this.solicitudSeleccion().some((item) => item.id === id);
  }

  private toggleSeleccionRecurso(id: number, titulo: string): void {
    this.solicitudSeleccion.update((lista) =>
      lista.some((item) => item.id === id)
        ? lista.filter((item) => item.id !== id)
        : [...lista, { id, titulo }],
    );
  }

  limpiarSeleccion(): void {
    this.solicitudSeleccion.set([]);
  }

  cerrarFormularioSolicitud(): void {
    this.mostrarFormularioSolicitud.set(false);
    this.solicitudError.set('');
    this.solicitudMensaje.set('');
  }

  enviarSolicitud(
    contactName: string,
    contactInfo: string,
    address: string,
  ): void {
    const resourceIds = this.solicitudSeleccion().map((item) => item.id);

    if (!resourceIds.length) {
      return;
    }

    // Necesitamos al menos una forma de encontrar a quien pide ayuda: un
    // contacto propio, o una direccion para poder visitarlo si no tiene un
    // telefono/email propio y seguro (por ejemplo, uso el celular de otra
    // persona para pedir ayuda).
    if (!contactInfo.trim() && !address.trim()) {
      this.solicitudError.set(
        'Dejanos un teléfono/email de contacto, o al menos una dirección para poder ayudarte.',
      );
      return;
    }

    this.solicitudError.set('');
    this.solicitudMensaje.set('');
    this.solicitudEnviando.set(true);

    this.http
      .post('/api/solicitudes', { resourceIds, contactName, contactInfo, address })
      .subscribe({
        next: () => {
          this.solicitudEnviando.set(false);
          this.solicitudMensaje.set(
            '¡Listo! Le avisamos a quien ofrece cada recurso.',
          );
          this.solicitudSeleccion.set([]);
          setTimeout(() => this.cerrarFormularioSolicitud(), 1800);
        },
        error: (error: HttpErrorResponse) => {
          this.solicitudEnviando.set(false);

          if (error.status === 401) {
            this.solicitudError.set(
              'Necesitás iniciar sesión para solicitar un recurso.',
            );
            return;
          }

          if (error.status === 400) {
            this.solicitudError.set(
              error.error?.message ??
                'Dejanos un teléfono/email de contacto, o al menos una dirección.',
            );
            return;
          }

          this.solicitudError.set(
            'No se pudo enviar la solicitud. Intentá nuevamente.',
          );
        },
      });
  }

  readonly categoriasAyuda = CATEGORIAS_AYUDA;
  readonly mostrarSelectorAyuda = signal(false);

  // Filtro de recursos por categoría, de selección múltiple: los mismos
  // botones que antes buscaban el más cercano de UNA categoría y saltaban
  // a él ahora togglean su propia categoría dentro y fuera de este array.
  // Sin categorías activas, no filtra (se ve todo).
  readonly categoriasActivas = signal<number[]>([]);

  toggleCategoriaActiva(categoriaId: number): void {
    const actuales = this.categoriasActivas();

    this.categoriasActivas.set(
      actuales.includes(categoriaId)
        ? actuales.filter((id) => id !== categoriaId)
        : [...actuales, categoriaId],
    );

    this.aplicarFiltroCategorias();
  }

  categoriaActiva(categoriaId: number): boolean {
    return this.categoriasActivas().includes(categoriaId);
  }

  // AND estricto, no OR: con 2+ categorías activas (ej. Alimentos y
  // Salud), el usuario quiere un establecimiento que cubra TODAS, no
  // cualquier recurso que tenga una de las dos — un traslado, no dos.
  //
  // Ojo con la unidad del filtro: un Recurso individual tiene una sola
  // categoria_id (Resource.category es @ManyToOne en el backend, no
  // @ManyToMany), así que ningún recurso puntual puede "cumplir" dos
  // categorías a la vez. El AND se evalúa por ORGANIZACIÓN (agrupando
  // sus recursos por usuario_id): una organización cumple el filtro si,
  // entre TODOS sus recursos publicados, cubre cada categoría activa
  // aunque sea con recursos distintos. Sin esto, seleccionar 2+
  // categorías vaciaría el mapa siempre.
  //
  // Los pines de recurso ya existen todos en resourceMarkers (se crean
  // una sola vez en initializeMap): filtrar solo agrega o saca la capa
  // del mapa, no recrea ni destruye marcadores.
  private aplicarFiltroCategorias(): void {
    if (!this.map) {
      return;
    }

    const activas = this.categoriasActivas();

    const categoriasPorOrganizacion = new Map<number, Set<number>>();

    this.recursos.forEach((recurso) => {
      const categorias =
        categoriasPorOrganizacion.get(recurso.usuario_id) ?? new Set<number>();
      categorias.add(recurso.categoria_id);
      categoriasPorOrganizacion.set(recurso.usuario_id, categorias);
    });

    this.recursos.forEach((recurso) => {
      const marker = this.resourceMarkers.get(recurso.id);

      if (!marker) {
        return;
      }

      const categoriasOrganizacion = categoriasPorOrganizacion.get(
        recurso.usuario_id,
      );

      const visible =
        !activas.length ||
        (categoriasOrganizacion != null &&
          activas.every((categoriaId) =>
            categoriasOrganizacion.has(categoriaId),
          ));

      if (visible) {
        if (!this.map!.hasLayer(marker)) {
          marker.addTo(this.map!);
        }
      } else if (this.map!.hasLayer(marker)) {
        this.map!.removeLayer(marker);
      }
    });
  }

  readonly ayudaCercana = signal<{
    id: number;
    titulo: string;
    organizationName?: string;
    distanciaKm: number;
  } | null>(null);

  readonly mostrarFormularioInvitado = signal(false);
  readonly invitadoRecursoId = signal<number | null>(null);
  readonly invitadoRecursoTitulo = signal('');
  readonly invitadoEnviando = signal(false);
  readonly invitadoError = signal('');
  readonly invitadoMensaje = signal('');

  private distanciaKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const radioTierra = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;

    return radioTierra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Ubicacion real del dispositivo: null si no hay geolocation, el usuario
  // no dio permiso, o se agoto el tiempo de espera. Solo se llama desde
  // usarMiUbicacion() (el botón), nunca sola — así el prompt del navegador
  // solo aparece cuando la persona lo pidió explícitamente.
  //
  // El timeout es generoso (20s) a propósito: el navegador muestra un
  // cartel pidiendo permiso y espera a que la persona lo toque. Con un
  // timeout corto, si tarda en reaccionar, el pedido se daba por perdido
  // ANTES de que llegara a aceptar.
  private obtenerUbicacionReal(): Promise<{ lat: number; lng: number } | null> {
    if (this.ubicacionRealPromise) {
      return this.ubicacionRealPromise;
    }

    this.ubicacionRealPromise = new Promise((resolve) => {
      if (!navigator.geolocation) {
        this.obteniendoUbicacion.set(false);
        this.mostrarToastUbicacion(
          'Tu navegador no permite compartir ubicación. Podés navegar el mapa manualmente.',
        );
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (posicion) => {
          this.obteniendoUbicacion.set(false);
          this.tengoUbicacion.set(true);
          resolve({
            lat: posicion.coords.latitude,
            lng: posicion.coords.longitude,
          });
        },
        (error) => {
          this.obteniendoUbicacion.set(false);
          // Se limpia la promesa cacheada para que el botón permita
          // reintentar (por ejemplo, si la persona recién ahora habilita
          // el permiso desde la configuración del navegador).
          this.ubicacionRealPromise = undefined;

          const mensaje =
            error.code === error.PERMISSION_DENIED
              ? 'Por favor, habilitá los permisos de ubicación en tu navegador para usar esta función.'
              : 'No pudimos obtener tu ubicación. Podés navegar el mapa manualmente.';

          this.mostrarToastUbicacion(mensaje);
          resolve(null);
        },
        { timeout: 20000 },
      );
    });

    return this.ubicacionRealPromise;
  }

  private mostrarToastUbicacion(mensaje: string): void {
    this.toastUbicacion.set(mensaje);
    clearTimeout(this.toastUbicacionTimeoutId);
    this.toastUbicacionTimeoutId = setTimeout(
      () => this.toastUbicacion.set(null),
      5000,
    );
  }

  // Se llama al tocar "📍 Usar mi ubicación actual". Si resuelve, agrega
  // el marcador "vos estás acá", recentra el mapa, y recalcula la ayuda
  // más cercana ahora que ya sabemos dónde está la persona.
  usarMiUbicacion(): void {
    if (this.obteniendoUbicacion() || this.tengoUbicacion()) {
      return;
    }

    this.obteniendoUbicacion.set(true);

    void this.obtenerUbicacionReal().then((ubicacion) => {
      if (!ubicacion) {
        return;
      }

      this.miUbicacion = ubicacion;

      if (this.map) {
        this.agregarMarcador(
          ubicacion.lat,
          ubicacion.lng,
          this.crearIconoMiUbicacion(),
          'Tu ubicación',
          'Vos estás acá',
          'Ubicación aproximada según tu dispositivo.',
        );

        this.map.panTo([ubicacion.lat, ubicacion.lng]);
      }

      void this.calcularAyudaMasCercana();
    });
  }

  // A diferencia de obtenerUbicacionReal(), esto NUNCA dispara el prompt
  // de permiso por su cuenta: solo usa la ubicación real si el usuario ya
  // la pidió con el botón, y si no, cae al centro de Córdoba — igual que
  // antes, pero sin pedir geolocalización a escondidas mientras se busca
  // "ayuda más cercana".
  private ubicacionParaCalculos(): { lat: number; lng: number } {
    return this.miUbicacion ?? CORDOBA_COORDS;
  }

  // Se calcula solo al cargar el mapa (y de nuevo si se comparte la
  // ubicación real), sin filtrar por categoría, para mostrar de entrada
  // cuál es la ayuda disponible más cerca del usuario común.
  private async calcularAyudaMasCercana(): Promise<void> {
    const disponibles = this.recursos.filter(
      (recurso) => recurso.estado === 'available',
    );

    if (!disponibles.length) {
      this.ayudaCercana.set(null);
      return;
    }

    const ubicacion = this.ubicacionParaCalculos();

    const masCercano = disponibles.reduce((cercano, actual) => {
      const distanciaActual = this.distanciaKm(
        ubicacion.lat,
        ubicacion.lng,
        actual.latitud,
        actual.longitud,
      );
      const distanciaCercano = this.distanciaKm(
        ubicacion.lat,
        ubicacion.lng,
        cercano.latitud,
        cercano.longitud,
      );

      return distanciaActual < distanciaCercano ? actual : cercano;
    });

    const distanciaKm = this.distanciaKm(
      ubicacion.lat,
      ubicacion.lng,
      masCercano.latitud,
      masCercano.longitud,
    );

    this.ayudaCercana.set({
      id: masCercano.id,
      titulo: masCercano.titulo,
      organizationName: masCercano.organizationName,
      distanciaKm: Math.round(distanciaKm * 10) / 10,
    });
  }

  irAAyudaMasCercana(): void {
    const cercana = this.ayudaCercana();

    if (!cercana) {
      return;
    }

    const marker = this.resourceMarkers.get(cercana.id);

    if (!marker) {
      return;
    }

    this.map?.setView(marker.getLatLng(), 16);
    marker.openPopup();
  }

  abrirFormularioInvitado(resourceId: number, titulo: string): void {
    this.invitadoRecursoId.set(resourceId);
    this.invitadoRecursoTitulo.set(titulo);
    this.invitadoError.set('');
    this.invitadoMensaje.set('');
    this.mostrarFormularioInvitado.set(true);
  }

  cerrarFormularioInvitado(): void {
    this.mostrarFormularioInvitado.set(false);
  }

  crearCuentaYSolicitar(
    firstName: string,
    lastName: string,
    address: string,
    email: string,
    gender: string,
    phone: string,
    password: string,
  ): void {
    const resourceId = this.invitadoRecursoId();

    if (!resourceId) {
      return;
    }

    if (!firstName || !lastName || !address || !email || !gender || !phone || !password) {
      this.invitadoError.set(
        'Completá nombre, apellido, dirección, correo, género, teléfono y contraseña.',
      );
      return;
    }

    this.invitadoError.set('');
    this.invitadoMensaje.set('');
    this.invitadoEnviando.set(true);

    this.http
      .post('/api/users', {
        firstName,
        lastName,
        email,
        password,
        phone,
        address,
        gender,
        roleId: CIUDADANO_ROLE_ID,
      })
      .subscribe({
        next: () => {
          this.authService.login(email, password).subscribe({
            next: () => {
              this.http
                .post('/api/solicitudes', {
                  resourceIds: [resourceId],
                  contactName: `${firstName} ${lastName}`,
                  contactInfo: phone || email,
                })
                .subscribe({
                  next: () => {
                    this.invitadoEnviando.set(false);
                    this.invitadoMensaje.set(
                      '¡Listo! Creamos tu cuenta y enviamos tu solicitud.',
                    );
                    setTimeout(() => this.cerrarFormularioInvitado(), 2200);
                  },
                  error: () => {
                    this.invitadoEnviando.set(false);
                    this.invitadoError.set(
                      'Tu cuenta se creó, pero no pudimos enviar la solicitud. Iniciá sesión y probá de nuevo desde el mapa.',
                    );
                  },
                });
            },
            error: () => {
              this.invitadoEnviando.set(false);
              this.invitadoError.set(
                'Tu cuenta se creó, pero no pudimos iniciar sesión automáticamente. Iniciá sesión manualmente.',
              );
            },
          });
        },
        error: (error: HttpErrorResponse) => {
          this.invitadoEnviando.set(false);

          if (error.status === 400) {
            this.invitadoError.set(
              'Ese correo ya está registrado. Iniciá sesión para solicitar ayuda.',
            );
            return;
          }

          this.invitadoError.set('No pudimos crear tu cuenta. Intentá nuevamente.');
        },
      });
  }

  mostrarLeyendaCritico(): boolean {
    return (
      this.rolActual() === 'moderador' &&
      this.comunidadesConSolicitudPendiente.length > 0
    );
  }

  mostrarLeyendaOrganizaciones(): boolean {
    return this.rolActual() === 'moderador';
  }

  mostrarLeyendaJurisdiccion(): boolean {
    const rol = this.rolActual();

    return rol === 'comunidad' || rol === 'ong';
  }

  // Para comunidad el criterio de "urgente" sigue siendo geografico (ver
  // marcarNecesidadesEnJurisdiccion). Para una ONG cambia: ya no es "esta
  // cerca", es "me la pidieron a mi" (ver cargarSolicitudesRecibidas), asi
  // que la etiqueta de la leyenda tiene que decir otra cosa.
  etiquetaPrioritarias(): string {
    return this.esOng() ? 'Dirigidas a tu ONG' : 'Prioritarias (tu jurisdicción)';
  }

  esOng(): boolean {
    return this.rolActual() === 'ong';
  }

  // El municipio de la jurisdiccion solo tiene sentido para una comunidad
  // (ver findDirectorioAyuda en el backend): una ONG no le pide recursos al
  // municipio, solo a otras ONGs.
  mostrarLeyendaMunicipioDirectorio(): boolean {
    return this.rolActual() === 'comunidad';
  }

  // Comunidad y ONG comparten esta capa (ver cargarDirectorioAyuda): para
  // una comunidad son "a quien pedirle ayuda"; para una ONG es la red de
  // pares con la que puede coordinar (tambien puede pedirles a otras ONGs).
  // El moderador ya se ve a si mismo como parte de organizacionesJurisdiccion.
  mostrarLeyendaDirectorioAyuda(): boolean {
    const rol = this.rolActual();

    return rol === 'comunidad' || rol === 'ong';
  }

  // El municipio no pide ayuda para si mismo (no es beneficiario): ofrece
  // recursos y aprueba ONGs/comunidades de su jurisdiccion. Cuando alguien
  // se acerca en persona a pedir ayuda, lo carga y lo deriva al centro que
  // corresponda desde "Solicitudes enviadas", no desde este selector de
  // autoservicio.
  esModerador(): boolean {
    return this.rolActual() === 'moderador';
  }

  private rolActual(): RolPublicador {
    const rol = this.authService.currentUser()?.role;

    if (rol === 'moderador' || rol === 'comunidad' || rol === 'ong') {
      return rol;
    }

    return 'ciudadano';
  }

  // Radio (en km) que se considera "mi jurisdiccion" para una comunidad/ong
  // logueada: dentro de este radio de su propia ubicacion registrada, una
  // necesidad se resalta en rojo como prioritaria.
  private static readonly RADIO_JURISDICCION_KM = 15;

  // Zoom con el que arranca el mapa del moderador, centrado en su propia
  // localidad (nivel ciudad, acorde al radio de jurisdiccion de arriba).
  private static readonly ZOOM_JURISDICCION = 12;

  private readonly necesidadesEnJurisdiccion = new Set<number>();

  private marcarNecesidadesEnJurisdiccion(): void {
    this.necesidadesEnJurisdiccion.clear();

    const miUbicacion = this.authService.currentUser();

    if (miUbicacion?.latitude == null || miUbicacion?.longitude == null) {
      return;
    }

    for (const necesidad of this.necesidades) {
      const distancia = this.distanciaKm(
        miUbicacion.latitude,
        miUbicacion.longitude,
        necesidad.latitud,
        necesidad.longitud,
      );

      if (distancia <= MapaComponent.RADIO_JURISDICCION_KM) {
        this.necesidadesEnJurisdiccion.add(necesidad.id);
      }
    }
  }

  // Cada rol ve un recorte distinto del mapa:
  // - ciudadano (o visitante sin sesion): ve todos los recursos disponibles,
  //   pero NO los pedidos de ayuda de otras personas (son datos sensibles:
  //   quien necesita ayuda y donde vive). Solo ve el suyo propio, si tiene uno.
  // - comunidad: ve todas las comunidades y ONGs del mapa (no solo las de su
  //   jurisdiccion) y a todas las personas que piden ayuda; las que estan
  //   dentro de su propia jurisdiccion se resaltan en rojo.
  // - ong: ve todas las comunidades y personas que podria ayudar en todo el
  //   mapa; las que estan dentro de su jurisdiccion se resaltan en rojo.
  // - moderador (municipio): ve todo, sin recorte.
  private aplicarVisibilidadPorRol(): void {
    // Una necesidad "resuelta" ya fue atendida (ver needs.service.ts): se
    // saca del mapa para cualquier rol antes de aplicar el recorte de
    // abajo, para que no siga saturando la vista con casos ya resueltos.
    this.necesidades = this.necesidades.filter(
      (necesidad) => necesidad.estado !== 'resuelta',
    );

    const rol = this.rolActual();
    const userId = this.authService.currentUser()?.id;
    const esPropio = (idPublicador: number) => idPublicador === userId;

    if (rol === 'moderador') {
      this.mapSubtitle.set(
        'Vista de moderador: todas las necesidades y recursos de tu jurisdicción',
      );
      return;
    }

    if (rol === 'comunidad') {
      // Un recurso del municipio (moderador) solo es visible si es de la
      // misma jurisdiccion que la comunidad: cada municipio le ofrece
      // recursos a las comunidades de su propia ciudad, no a otras. Las
      // ONGs y otras comunidades, en cambio, se ven en todo el mapa.
      const miCiudad = this.authService
        .currentUser()
        ?.ciudad?.trim()
        .toLowerCase();

      this.recursos = this.recursos.filter(
        (recurso) =>
          recurso.rolPublicador === 'ong' ||
          recurso.rolPublicador === 'comunidad' ||
          esPropio(recurso.usuario_id) ||
          (recurso.rolPublicador === 'moderador' &&
            !!miCiudad &&
            recurso.organizacionCiudad?.trim().toLowerCase() === miCiudad),
      );
      this.necesidades = this.necesidades.filter(
        (necesidad) =>
          necesidad.rolPublicador === 'ciudadano' ||
          esPropio(necesidad.usuario_id),
      );
      this.marcarNecesidadesEnJurisdiccion();
      this.mapSubtitle.set(
        'Todas las comunidades y ONGs del mapa, y personas que necesitan ayuda — en rojo, las de tu jurisdicción',
      );
      return;
    }

    if (rol === 'ong') {
      this.necesidades = this.necesidades.filter(
        (necesidad) =>
          necesidad.rolPublicador === 'comunidad' ||
          necesidad.rolPublicador === 'ciudadano' ||
          esPropio(necesidad.usuario_id),
      );
      // A diferencia de comunidad, acá el color ya no depende de la
      // jurisdicción (ver cargarSolicitudesRecibidasParaMapa + la regla de
      // color en initializeMap), así que no hace falta
      // marcarNecesidadesEnJurisdiccion().
      this.mapSubtitle.set(
        'Todas las comunidades y personas que podrían necesitar tus recursos — en rojo, las que ya te pidieron ayuda a vos',
      );
      return;
    }

    // Ciudadano o visitante sin sesion: los pedidos de ayuda de otras
    // personas son privados, solo los ve quien los publico. Los recursos
    // (la ayuda disponible) siguen siendo publicos para todos.
    this.necesidades = this.necesidades.filter((necesidad) =>
      esPropio(necesidad.usuario_id),
    );
    this.mapSubtitle.set('Descubrí ONGs y comunidades activas en tu zona');
  }

  private agregarMarcador(
    latitud: number,
    longitud: number,
    icon: L.Icon | L.DivIcon,
    encabezado: string,
    titulo: string,
    descripcion: string,
    infoAdicional = '',
    solicitudRecurso?: { id: number; titulo: string },
  ): L.Marker {
    const marker = L.marker(
      [latitud, longitud],
      { icon },
    ).addTo(this.map!);

    const haySesion = !!this.authService.currentUser();
    const checkboxId = solicitudRecurso
      ? `solicitar-recurso-${solicitudRecurso.id}`
      : '';
    const guestBtnId = solicitudRecurso
      ? `solicitar-invitado-${solicitudRecurso.id}`
      : '';

    let controlHtml = '';

    if (solicitudRecurso && haySesion) {
      controlHtml = `<label class="popup-solicitar">
           <input type="checkbox" id="${checkboxId}" ${this.estaSeleccionado(solicitudRecurso.id) ? 'checked' : ''}>
           Agregar a mi solicitud
         </label>`;
    } else if (solicitudRecurso && !haySesion) {
      controlHtml = `<button type="button" class="popup-solicitar-btn" id="${guestBtnId}">Solicitar ayuda</button>`;
    }

    marker.bindPopup(`
      <strong>${encabezado}</strong><br>
      <strong>${titulo}</strong><br>
      ${descripcion}
      ${infoAdicional}
      ${controlHtml}
    `);

    if (solicitudRecurso && haySesion) {
      marker.on('popupopen', () => {
        const checkbox = document.getElementById(
          checkboxId,
        ) as HTMLInputElement | null;

        checkbox?.addEventListener('change', () => {
          this.toggleSeleccionRecurso(
            solicitudRecurso.id,
            solicitudRecurso.titulo,
          );
        });
      });
    } else if (solicitudRecurso && !haySesion) {
      marker.on('popupopen', () => {
        const boton = document.getElementById(guestBtnId);

        boton?.addEventListener('click', () => {
          this.abrirFormularioInvitado(
            solicitudRecurso.id,
            solicitudRecurso.titulo,
          );
        });
      });
    }

    return marker;
  }

  private formatearFecha(fecha: string): string {
    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) {
      return fecha;
    }

    return date.toLocaleDateString('es-AR');
  }

  private construirInfoResuelta(resolvedAt?: string): string {
    if (!resolvedAt) {
      return '';
    }

    return `<br>Resuelta el ${this.formatearFecha(resolvedAt)}`;
  }

  // El campo de contacto es texto libre (puede ser un email, un telefono, o
  // una referencia como "en la plaza San Martin"): armar siempre un link
  // "mailto:" rompia el contacto cada vez que no era una direccion de
  // correo valida. Ahora se arma el link que corresponda segun el formato,
  // y si no es ninguno de los dos se muestra como texto simple.
  private construirInfoContacto(
    contactInfo?: string,
    contactName?: string,
  ): string {
    if (!contactInfo || !this.authService.currentUser()) {
      return '';
    }

    const valor = contactInfo.trim();
    const etiquetaNombre = contactName ? `: ${contactName}` : '';
    const esEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
    const esTelefono = /^[\d\s()+-]{6,}$/.test(valor);

    if (esEmail) {
      return `<br><a href="mailto:${valor}">Contactar${etiquetaNombre}</a>`;
    }

    if (esTelefono) {
      const numeroLimpio = valor.replace(/[\s()-]/g, '');
      return `<br><a href="tel:${numeroLimpio}">Contactar${etiquetaNombre}</a>`;
    }

    return `<br>Contacto${etiquetaNombre}: ${valor}`;
  }

  private construirInfoMatches(recursosSugeridos: string[]): string {
    if (!recursosSugeridos.length) {
      return '';
    }

    return `<br>Recursos sugeridos: ${recursosSugeridos.join(', ')}`;
  }

  // Regla de color de necesidades:
  // - comunidad: geografico, como siempre (jurisdiccion = urgente/rojo
  //   fuerte, el resto en el naranja habitual de "pide ayuda").
  // - ONG: ya no es geografico. Solo se resalta en rojo/urgente a quien
  //   tiene una solicitud activa dirigida especificamente a ESTA ONG (ver
  //   cargarSolicitudesRecibidasParaMapa); el resto se atenua a gris
  //   ("contexto") para dejar claro que no es su responsabilidad directa.
  // - cualquier otro rol: sin distincion, todo en el naranja habitual.
  private colorParaNecesidad(
    necesidad: Necesidad,
  ): 'red' | 'urgent' | 'contexto' {
    if (this.rolActual() === 'ong') {
      return this.usuariosConSolicitudActivaHaciaMi.has(necesidad.usuario_id)
        ? 'urgent'
        : 'contexto';
    }

    return this.necesidadesEnJurisdiccion.has(necesidad.id) ? 'urgent' : 'red';
  }

  private construirInfoDirigidaOng(necesidad: Necesidad): string {
    if (!this.esOng()) {
      return '';
    }

    return this.usuariosConSolicitudActivaHaciaMi.has(necesidad.usuario_id)
      ? '<br>📩 Te pidió ayuda directamente a vos.'
      : '<br>No es una solicitud dirigida a tu ONG — se muestra solo como contexto de la zona.';
  }

  // A diferencia de construirInfoContacto() (que exige sesión iniciada
  // porque expone un teléfono/email personal), esto es información
  // pública del lugar en sí — nombre, categoría, dirección y horario —
  // pensada para que cualquiera, logueado o no, sepa qué es el lugar y
  // cómo llegar antes de decidir contactarlo.
  private construirInfoRecurso(recurso: Recurso): string {
    const lineas: string[] = [];

    if (recurso.organizationName) {
      lineas.push(`<strong>${recurso.organizationName}</strong>`);
    }

    if (recurso.categoriaNombre) {
      lineas.push(`Categoría: ${recurso.categoriaNombre}`);
    }

    if (recurso.direccion) {
      lineas.push(`📍 ${recurso.direccion}`);
    }

    if (recurso.horario) {
      lineas.push(`🕒 ${recurso.horario}`);
    }

    if (!lineas.length) {
      return '';
    }

    return `<br>${lineas.join('<br>')}`;
  }

  ngAfterViewInit(): void {
    this.loadDataFromBackend()
      .catch(() => {})
      .then(() => {
        this.aplicarVisibilidadPorRol();
        this.cargandoDatos.set(false);

        // El mapa se dibuja de una: ya no espera a que la geolocalización
        // resuelva. Antes initializeMap() quedaba bloqueado hasta 20s
        // (el timeout de getCurrentPosition) con el mapa completamente en
        // blanco — el salto brusco que había que corregir.
        this.initializeMap();
        // La geolocalización ya no arranca sola acá: queda esperando a
        // que el usuario toque "Usar mi ubicación actual" (ver
        // usarMiUbicacion()).
      });
  }

  private async loadDataFromBackend(): Promise<void> {
    try {
      const [needsRes, resourcesRes] = await Promise.all([
        fetch('/api/needs'),
        fetch('/api/resources'),
      ]);

      if (!needsRes.ok || !resourcesRes.ok) {
        throw new Error(
          `Error al cargar datos: ${needsRes.status} / ${resourcesRes.status}`,
        );
      }

      const [needsJson, resourcesJson] = await Promise.all([
        needsRes.json(),
        resourcesRes.json(),
      ]);

      const necesidades: Necesidad[] = needsJson.map((n: any) => ({
        id: n.id,
        usuario_id: n.userId ?? n.user_id ?? 0,
        categoria_id:
          n.categoryId ?? n.category_id ?? 0,
        titulo: n.title ?? n.titulo ?? '',
        descripcion:
          n.description ?? n.descripcion ?? '',
        latitud: Number(
          n.latitude ?? n.latitud ?? 0,
        ),
        longitud: Number(
          n.longitude ?? n.longitud ?? 0,
        ),
        estado: n.status ?? n.estado ?? '',
        fecha_creacion:
          n.createdAt ?? n.fecha_creacion ?? '',
        rolPublicador: rolPublicadorDesde(n.user?.roleId),
        contactName: n.contactName,
        contactInfo: n.contactInfo,
        resolvedAt: n.resolvedAt,
        recursosSugeridos: [],
      }));

      this.necesidades = await Promise.all(
        necesidades.map(async (necesidad) => {
          try {
            const matchesRes = await fetch(
              `/api/needs/${necesidad.id}/matches`,
            );

            if (!matchesRes.ok) {
              return necesidad;
            }

            const matchesJson = await matchesRes.json();

            const recursosSugeridos: string[] = Array.isArray(
              matchesJson,
            )
              ? matchesJson
                  .map((recurso: any) => recurso.title)
                  .filter(Boolean)
              : [];

            return { ...necesidad, recursosSugeridos };
          } catch {
            return necesidad;
          }
        }),
      );

      this.recursos = resourcesJson.map((r: any) => ({
        id: r.id,
        usuario_id: r.userId ?? r.user_id ?? 0,
        categoria_id:
          r.categoryId ?? r.category_id ?? 0,
        titulo: r.title ?? r.titulo ?? '',
        descripcion:
          r.description ?? r.descripcion ?? '',
        latitud: Number(
          r.latitude ?? r.latitud ?? 0,
        ),
        longitud: Number(
          r.longitude ?? r.longitud ?? 0,
        ),
        estado: r.status ?? r.estado ?? '',
        fecha_creacion:
          r.createdAt ?? r.fecha_creacion ?? '',
        rolPublicador: rolPublicadorDesde(r.user?.roleId),
        contactInfo: r.contactInfo,
        resolvedAt: r.resolvedAt,
        organizationName: r.organizationName,
        organizacionCiudad: r.user?.ciudad,
        direccion: r.address,
        horario: r.schedule,
        categoriaNombre: r.category?.name,
      }));

      if (this.rolActual() === 'moderador') {
        // El moderador ya tiene su propia vista de la red (con ubicación
        // exacta): no hace falta sumarle también la capa pública
        // redondeada, sería un pin duplicado de la misma comunidad con
        // menos precisión.
        await this.cargarOrganizacionesDeJurisdiccion();
        await this.cargarComunidadesConSolicitudPendiente();
      } else {
        await this.cargarComunidadesCriticasPublico();

        // Comunidad y ONG ademas ven, siempre activo (no es un toggle
        // mas), a su red de referencia territorial: una comunidad ve al
        // Municipio de su jurisdiccion + todas las ONGs aprobadas; una ONG
        // ve a esas mismas ONGs (findDirectorioAyuda ya resuelve esta
        // diferencia del lado del backend). La capa de arriba (criticas
        // publico) es para donar/ayudar a otros; esta es sobre a quien SE
        // le puede pedir.
        if (this.rolActual() === 'comunidad' || this.rolActual() === 'ong') {
          await this.cargarDirectorioAyuda();
        }

        // Solo una ONG necesita esto: distinguir, entre las necesidades
        // que ve en el mapa, cuales son realmente suyas (alguien le mandó
        // una solicitud activa a ELLA) de las que solo son contexto de la
        // zona. Ver la regla de color en initializeMap().
        if (this.rolActual() === 'ong') {
          await this.cargarSolicitudesRecibidasParaMapa();
        }
      }
    } catch (err) {
      // Si no hay backend disponible, mantenemos los datos locales.
      // eslint-disable-next-line no-console
      console.warn(
        'Mapa: no se pudo cargar datos desde backend, usando datos locales',
        err,
      );
    }
  }

  // Capa pública para donantes: comunidades en estado crítico en TODO el
  // mapa (no solo una jurisdicción), sin login, con ubicación ya
  // redondeada por el backend. No usa fetch con token — el endpoint es
  // público a propósito.
  private async cargarComunidadesCriticasPublico(): Promise<void> {
    try {
      const res = await fetch('/api/users/comunidades-criticas-publico');

      if (!res.ok) {
        return;
      }

      this.comunidadesCriticasPublico = await res.json();
    } catch {
      // Sin esta capa el mapa sigue funcionando igual, no hace falta
      // romper nada si el endpoint no responde.
    }
  }

  // Mismo endpoint que ya usa "Mis solicitudes" para el selector de "a
  // quien pedirle ayuda" (requiere sesión: es el propio JWT el que decide
  // si sos comunidad u ONG). Acá se reutiliza tal cual, solo para dibujar
  // esos mismos destinatarios en el mapa en vez de en un <select>.
  private async cargarDirectorioAyuda(): Promise<void> {
    const token = this.authService.getToken();

    if (!token) {
      return;
    }

    try {
      const res = await fetch('/api/users/directorio-ayuda', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        return;
      }

      const destinatarios: DirectorioAyudaEntry[] = await res.json();

      this.directorioAyuda = destinatarios.filter(
        (entrada) => entrada.latitude != null && entrada.longitude != null,
      );
    } catch {
      // Sin esta capa el mapa sigue funcionando igual, no hace falta
      // romper nada si el endpoint no responde.
    }
  }

  // Mismo endpoint que ya usa el panel "Solicitudes recibidas" de una ONG:
  // solicitudes donde ELLA es la destinataria (por ser dueña del recurso
  // pedido, o por haber sido elegida directamente). Acá no se listan, solo
  // se usa el id de quien las mandó para decidir el color de su pin de
  // necesidad en el mapa (ver "Regla de Color Crítica" en initializeMap()).
  private async cargarSolicitudesRecibidasParaMapa(): Promise<void> {
    const token = this.authService.getToken();

    if (!token) {
      return;
    }

    try {
      const res = await fetch('/api/solicitudes/recibidas', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        return;
      }

      const solicitudes: SolicitudRecibidaMapa[] = await res.json();

      // Solo cuentan las que todavia estan activas: una rechazada, ya
      // atendida o derivada a otra entidad no es una alerta pendiente para
      // esta ONG.
      this.usuariosConSolicitudActivaHaciaMi = new Set(
        solicitudes
          .filter((s) => s.status === 'pendiente' || s.status === 'aprobada')
          .map((s) => s.user.id),
      );
    } catch {
      // Sin esto, ninguna necesidad se resalta como "dirigida a mi": el
      // resto del mapa sigue funcionando igual.
    }
  }

  // Toda la red (?scope=all, ver users.controller.ts): antes solo traía la
  // propia jurisdiccion del moderador, dejando el resto del mapa vacío de
  // organizaciones. Ahora trae todo el país y se marca cuáles son de su
  // propia ciudad (enJurisdiccion) para atenuar visualmente al resto, sin
  // ocultarlo — así el moderador ve a toda la red pero su jurisdicción
  // sigue siendo lo primero que resalta.
  private async cargarOrganizacionesDeJurisdiccion(): Promise<void> {
    const token = this.authService.getToken();

    if (!token) {
      return;
    }

    try {
      const usersRes = await fetch('/api/users?scope=all', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!usersRes.ok) {
        return;
      }

      const usersJson = await usersRes.json();
      const miCiudad = this.authService
        .currentUser()
        ?.ciudad?.trim()
        .toLowerCase();

      this.organizacionesJurisdiccion = (usersJson as any[])
        .filter(
          (u) => u.approved && (u.role?.name === 'comunidad' || u.role?.name === 'ong'),
        )
        .map((u) => {
          // La organización no siempre tiene su propia latitud/longitud
          // cargada (recién se completa si edita su perfil): mientras
          // tanto, se usa la de su necesidad activa más reciente como
          // respaldo, para no perderla del mapa del moderador — mismo
          // criterio que findComunidadesCriticasPublico en el backend.
          const necesidadPropia = this.necesidades.find(
            (necesidad) => necesidad.usuario_id === u.id,
          );

          return {
            id: u.id,
            nombre: u.organizationName ?? `${u.firstName} ${u.lastName}`,
            lat: Number(u.latitude ?? necesidadPropia?.latitud),
            lng: Number(u.longitude ?? necesidadPropia?.longitud),
            tipo: u.role.name as 'comunidad' | 'ong',
            enJurisdiccion:
              !!miCiudad && u.ciudad?.trim().toLowerCase() === miCiudad,
            critico: u.estadoAyuda === 'critico',
          };
        })
        .filter((organizacion) => !isNaN(organizacion.lat) && !isNaN(organizacion.lng));
    } catch {
      // Si falla, simplemente no se muestran organizaciones adicionales.
    }
  }

  // Regla de alerta del Municipio: ya no es "estado crítico" autodeclarado,
  // es "me mandaron una solicitud pendiente a mí" (mismo endpoint que ya
  // usa el panel "Solicitudes recibidas"). Apenas se aprueba o rechaza dej
  // a de estar pendiente, así que el pin desaparece solo — no hace falta
  // borrarlo a mano en ningún otro lado.
  private async cargarComunidadesConSolicitudPendiente(): Promise<void> {
    const token = this.authService.getToken();

    if (!token) {
      return;
    }

    try {
      const res = await fetch('/api/solicitudes/recibidas', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        return;
      }

      const solicitudes: SolicitudRecibidaConUbicacion[] = await res.json();

      const porUsuario = new Map<number, SolicitudRecibidaConUbicacion['user']>();

      solicitudes
        .filter(
          (s) =>
            s.status === 'pendiente' &&
            s.user.roleId === COMUNIDAD_ROLE_ID &&
            s.user.latitude != null &&
            s.user.longitude != null,
        )
        .forEach((s) => porUsuario.set(s.user.id, s.user));

      this.comunidadesConSolicitudPendiente = Array.from(
        porUsuario.values(),
      ).map((u) => ({
        id: u.id,
        nombre: u.organizationName ?? 'Comunidad',
        lat: Number(u.latitude),
        lng: Number(u.longitude),
      }));
    } catch {
      // Sin esto, no se resalta ninguna comunidad como alerta roja: el
      // resto del mapa sigue funcionando igual.
    }
  }

  private initializeMap(): void {
    if (this.map) {
      return;
    }

    const cordobaCoordinates: L.LatLngExpression = [
      -31.4201,
      -64.1888,
    ];

    this.map = L.map(
      this.mapContainer.nativeElement,
      {
        center: cordobaCoordinates,
        zoom: 13,
      },
    );

    L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        className: 'warm-map-tiles',
        attribution:
          '&copy; OpenStreetMap contributors',
      },
    ).addTo(this.map);

    const bounds = L.latLngBounds([]);

    this.necesidades.forEach((necesidad) => {
      const infoAdicional =
        this.construirInfoResuelta(necesidad.resolvedAt) +
        this.construirInfoContacto(
          necesidad.contactInfo,
          necesidad.contactName,
        ) +
        this.construirInfoMatches(necesidad.recursosSugeridos) +
        this.construirInfoDirigidaOng(necesidad);

      const color = this.colorParaNecesidad(necesidad);

      this.agregarMarcador(
        necesidad.latitud,
        necesidad.longitud,
        necesidad.rolPublicador === 'ciudadano'
          ? this.crearIconoPersona(color)
          : this.crearIconoOrganizacion(color, necesidad.rolPublicador),
        'Necesidad',
        necesidad.titulo,
        necesidad.descripcion,
        infoAdicional,
      );

      bounds.extend([necesidad.latitud, necesidad.longitud]);
    });

    const currentUserId = this.authService.currentUser()?.id;

    this.recursos.forEach((recurso) => {
      const distanciaTexto = this.miUbicacion
        ? `<br>📍 A ${
            Math.round(
              this.distanciaKm(
                this.miUbicacion.lat,
                this.miUbicacion.lng,
                recurso.latitud,
                recurso.longitud,
              ) * 10,
            ) / 10
          } km de tu ubicación`
        : '';

      const infoAdicional =
        this.construirInfoRecurso(recurso) +
        this.construirInfoResuelta(recurso.resolvedAt) +
        this.construirInfoContacto(recurso.contactInfo) +
        distanciaTexto;

      // El municipio no es beneficiario: no pide recursos para si mismo
      // desde el mapa, los ofrece (o deriva a un tercero desde "Solicitudes
      // enviadas"). El mapa para el moderador es solo de visualizacion.
      const puedeSolicitar =
        recurso.estado === 'available' &&
        recurso.usuario_id !== currentUserId &&
        this.rolActual() !== 'moderador';

      const marker = this.agregarMarcador(
        recurso.latitud,
        recurso.longitud,
        this.crearIconoOrganizacion('blue', recurso.rolPublicador),
        'Recurso',
        recurso.titulo,
        recurso.descripcion,
        infoAdicional,
        puedeSolicitar
          ? { id: recurso.id, titulo: recurso.titulo }
          : undefined,
      );

      this.resourceMarkers.set(recurso.id, marker);
      bounds.extend([recurso.latitud, recurso.longitud]);
    });

    this.comunidadesConSolicitudPendiente.forEach((comunidad) => {
      this.agregarMarcador(
        comunidad.lat,
        comunidad.lng,
        this.crearIconoOrganizacion('urgent', 'comunidad'),
        'Alerta',
        `${comunidad.nombre} — Te pidió ayuda directamente`,
        'Esta comunidad te mandó una solicitud pendiente a vos. Revisala desde "Solicitudes recibidas" para aprobarla o rechazarla.',
      );

      bounds.extend([comunidad.lat, comunidad.lng]);
    });

    // Los marcadores se crean siempre (para poder togglearlos despues con
    // el filtro "Quiero Donar / Ayudar"), pero si el filtro arranca
    // apagado se sacan del mapa apenas se crean.
    this.donarMarkers = this.comunidadesCriticasPublico.map((comunidad) => {
      const necesitaTexto = comunidad.necesita.length
        ? `<br>Necesita: ${comunidad.necesita.join(', ')}`
        : '';
      const horarioTexto = comunidad.horario
        ? `<br>🕒 ${comunidad.horario}`
        : '';
      const ciudadTexto = comunidad.ciudad
        ? `<br>📍 Zona: ${comunidad.ciudad}`
        : '';

      const marker = this.agregarMarcador(
        comunidad.lat,
        comunidad.lng,
        this.crearIconoOrganizacion('donar', 'comunidad'),
        'Quiero donar / ayudar',
        comunidad.nombre,
        'Esta comunidad avisó que necesita ayuda. La ubicación es aproximada; coordiná la donación desde "Solicitar ayuda" o el directorio.' +
          ciudadTexto +
          horarioTexto +
          necesitaTexto,
      );

      bounds.extend([comunidad.lat, comunidad.lng]);

      return marker;
    });

    if (!this.mostrarCapaDonar()) {
      this.donarMarkers.forEach((marker) => this.map?.removeLayer(marker));
    }

    this.organizacionesJurisdiccion.forEach((organizacion) => {
      // El estado crítico solo se resalta dentro de la propia jurisdicción:
      // fuera de ella es "referencia del resto de la red", no algo que el
      // moderador tenga que atender él.
      const esCriticaEnJurisdiccion =
        organizacion.critico && organizacion.enJurisdiccion;

      this.agregarMarcador(
        organizacion.lat,
        organizacion.lng,
        this.crearIconoOrganizacion(
          esCriticaEnJurisdiccion ? 'donar' : 'blue',
          organizacion.tipo,
          !organizacion.enJurisdiccion,
        ),
        organizacion.tipo === 'comunidad' ? 'Comunidad' : 'ONG',
        organizacion.nombre,
        esCriticaEnJurisdiccion
          ? 'Organización de tu jurisdicción en estado crítico — avisó que necesita ayuda.'
          : organizacion.enJurisdiccion
            ? 'Organización de tu jurisdicción.'
            : 'Organización de otra jurisdicción — se muestra como referencia del resto de la red.',
      );

      bounds.extend([organizacion.lat, organizacion.lng]);
    });

    // Para una comunidad logueada: el Municipio de su jurisdicción (pin
    // propio, ver crearIconoMunicipio) y todas las ONGs aprobadas a las
    // que le puede pedir recursos (mismo pin azul/edificio que ya usan
    // las demás organizaciones). Queda vacío para cualquier otro rol.
    this.directorioAyuda.forEach((entidad) => {
      if (entidad.latitude == null || entidad.longitude == null) {
        return;
      }

      const esMunicipio = entidad.role === 'moderador';

      this.agregarMarcador(
        entidad.latitude,
        entidad.longitude,
        esMunicipio
          ? this.crearIconoMunicipio()
          : this.crearIconoOrganizacion('blue', 'ong'),
        esMunicipio ? 'Municipio' : 'ONG',
        entidad.organizationName,
        esMunicipio
          ? 'Municipio de tu jurisdicción: pedile recursos directamente desde "Solicitudes enviadas".'
          : 'ONG aprobada: podés pedirle recursos desde "Solicitudes enviadas".',
      );

      bounds.extend([entidad.latitude, entidad.longitude]);
    });

    // El marcador "vos estás acá" no se agrega acá: solo se suma cuando
    // el usuario toca "Usar mi ubicación actual" (ver usarMiUbicacion()),
    // nunca automáticamente.

    let ubicacionPropiaModerador: L.LatLngExpression | undefined;

    if (this.rolActual() === 'moderador') {
      const yo = this.authService.currentUser();

      if (yo?.latitude != null && yo?.longitude != null) {
        const nombreMunicipio =
          yo.organizationName ?? `Municipio de ${yo.ciudad ?? ''}`;

        this.agregarMarcador(
          yo.latitude,
          yo.longitude,
          this.crearIconoOrganizacion('blue', 'moderador'),
          'Municipio',
          nombreMunicipio,
          'Tu ubicación registrada.',
        );

        bounds.extend([yo.latitude, yo.longitude]);
        ubicacionPropiaModerador = [yo.latitude, yo.longitude];
      }
    }

    // El moderador ve todo el mapa (sin recorte de datos), pero arranca
    // centrado en su propia jurisdiccion en vez de encuadrar toda la
    // provincia: sigue pudiendo alejar el zoom o mover el mapa a mano para
    // ver el resto de las jurisdicciones cuando quiera.
    if (ubicacionPropiaModerador) {
      this.map.setView(ubicacionPropiaModerador, MapaComponent.ZOOM_JURISDICCION);
    } else if (bounds.isValid()) {
      // Los datos de prueba ya no son solo de la capital: en vez de un zoom
      // fijo, encuadramos el mapa para que se vea todo lo que hay cargado
      // (toda la provincia si asi esta sembrado), sin pasarnos de zoom si
      // los puntos estan muy juntos.
      this.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }

    requestAnimationFrame(() => {
      this.map?.invalidateSize();
    });

    // El municipio no pide ayuda para si mismo: no tiene sentido pedirle
    // la ubicacion del dispositivo para buscarle "la ayuda mas cercana".
    if (this.rolActual() !== 'moderador') {
      void this.calcularAyudaMasCercana();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }
}