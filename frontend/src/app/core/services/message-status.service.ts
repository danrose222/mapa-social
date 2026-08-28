import { Injectable, signal } from '@angular/core';

// Estado de gestión que una organización le pone a un mensaje entrante
// (necesidad privada, solicitud de recurso o mensaje de colaboración) en
// su propio panel -- puramente informativo para ella misma, no cambia
// nada del lado de quien escribió. 'nuevo' es el default implícito, no
// se guarda explícitamente hasta que alguien lo cambia.
export type MessageStatus = 'nuevo' | 'contactado' | 'tomado' | 'rechazado' | 'revision';

export const MESSAGE_STATUS_OPTIONS: { value: MessageStatus; label: string }[] = [
  { value: 'nuevo', label: 'Sin gestionar' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'tomado', label: 'Tomado' },
  { value: 'revision', label: 'Para revisar' },
  { value: 'rechazado', label: 'Rechazado' },
];

const STORAGE_KEY = 'mapa-social:message-status';

// Guarda el estado de gestión en localStorage, no en el backend -- es una
// nota interna de la organización sobre CÓMO va gestionando cada mensaje,
// no un dato del mensaje en sí (necesidades/solicitudes/colaboraciones no
// tienen columna de estado propia hoy, y agregarla + el permiso para que
// una organización -que no es la dueña de la publicación- la edite es un
// cambio de backend más grande). Vive en el navegador de quien lo usa: no
// se sincroniza entre dispositivos ni entre personas de la misma
// organización. Suficiente para que una sola cuenta lleve el seguimiento
// de su propia bandeja.
@Injectable({ providedIn: 'root' })
export class MessageStatusService {
  private readonly statuses = signal<Record<string, MessageStatus>>(this.readFromStorage());

  private readFromStorage(): Record<string, MessageStatus> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private writeToStorage(value: Record<string, MessageStatus>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Sin espacio, modo privado, etc. -- el estado sigue funcionando en
      // memoria durante la sesión, solo no sobrevive a un refresh.
    }
  }

  // key identifica el mensaje sin ambigüedad entre las tres bandejas --
  // ver los helpers needKey/resourceRequestKey/collaborationKey más abajo.
  statusOf(key: string): MessageStatus {
    return this.statuses()[key] ?? 'nuevo';
  }

  setStatus(key: string, status: MessageStatus): void {
    const next = { ...this.statuses(), [key]: status };
    this.statuses.set(next);
    this.writeToStorage(next);
  }
}

export function needKey(id: number): string {
  return `need:${id}`;
}

export function resourceRequestKey(id: number): string {
  return `resource-request:${id}`;
}

export function collaborationRequestKey(id: number): string {
  return `collaboration-request:${id}`;
}
