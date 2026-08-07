import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';

// Fondo animado del hero: una red de casitas, corazones, personitas y
// manitos-con-corazon que se conectan entre si, laten como un pulso, y de
// tanto en tanto se mandan un "envio de ayuda" (un punto dorado viajando por
// la conexion). Casa/corazon/persona son los mismos iconos que ya usan los
// pines del mapa; "manos con corazon" (icono de Material "volunteer_activism")
// suma la idea de colaboracion humana. Asi el hero anticipa visualmente el
// propósito del proyecto: una red que llega a los hogares que lo necesitan.
interface Nodo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tipo: 'casa' | 'corazon' | 'persona' | 'manos-corazon';
  fase: number;
}

interface PulsoViajero {
  desde: Nodo;
  hasta: Nodo;
  progreso: number;
}

const HOUSE_PATH = 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z';
const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
const PERSON_PATH =
  'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z';

// Color calido ya usado en este mismo hero (el "eyebrow" de arriba de todo):
// las personitas lo toman para distinguirse del blanco de las casitas.
const COLOR_PERSONA = '246, 220, 194';
const COLOR_ACENTO = '217, 140, 43';

const DISTANCIA_CONEXION = 170;
const CANTIDAD_NODOS = 18;
const INTERVALO_PULSO_FRAMES = 90;
const TAMANO_ICONO = 16;
const TAMANO_CORAZON_SOLO = 15;

@Component({
  selector: 'app-hero-network',
  standalone: true,
  template: `<canvas #canvas class="hero-network-canvas" aria-hidden="true"></canvas>`,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        display: block;
        pointer-events: none;
      }

      .hero-network-canvas {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class HeroNetworkComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true })
  private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx?: CanvasRenderingContext2D;
  private nodos: Nodo[] = [];
  private pulsos: PulsoViajero[] = [];
  private frameId?: number;
  private resizeObserver?: ResizeObserver;
  private ancho = 0;
  private alto = 0;
  private tiempo = 0;

  // Zona (elipse) que ocupa el texto del hero: los nodos evitan nacer ahi y
  // se alejan suavemente si se acercan, para no taparlo.
  private zonaCentroX = 0;
  private zonaCentroY = 0;
  private zonaRadioX = 0;
  private zonaRadioY = 0;

  private readonly casaPath = new Path2D(HOUSE_PATH);
  private readonly corazonPath = new Path2D(HEART_PATH);
  private readonly personaPath = new Path2D(PERSON_PATH);

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    this.ctx = ctx;

    this.resizeObserver = new ResizeObserver(() => {
      this.ajustarTamano();
      this.calcularZonaTexto();
      this.generarNodos();
    });
    this.resizeObserver.observe(canvas);
    this.ajustarTamano();
    this.calcularZonaTexto();
    this.generarNodos();

    // "manos-corazon" se dibuja con la fuente de iconos de Material (ya
    // cargada por la app): si todavia no termino de cargar, redibujamos una
    // vez que este lista para no quedarnos con el frame estatico sin ella.
    document.fonts?.ready.then(() => this.dibujarFrame());

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.dibujarFrame();
      return;
    }

    const loop = () => {
      this.actualizar();
      this.dibujarFrame();
      this.frameId = requestAnimationFrame(loop);
    };

    this.frameId = requestAnimationFrame(loop);
  }

  ngOnDestroy(): void {
    if (this.frameId !== undefined) {
      cancelAnimationFrame(this.frameId);
    }

    this.resizeObserver?.disconnect();
  }

  private ajustarTamano(): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.ancho = rect.width;
    this.alto = rect.height;

    canvas.width = Math.round(this.ancho * dpr);
    canvas.height = Math.round(this.alto * dpr);

    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private calcularZonaTexto(): void {
    const canvas = this.canvasRef.nativeElement;
    // El padre inmediato del canvas es el host <app-hero-network>: ".hero-content"
    // es hermano del host, asi que hay que subir un nivel mas para encontrarlo.
    const contenido = canvas.parentElement?.parentElement?.querySelector<HTMLElement>(
      '.hero-content',
    );

    if (!contenido) {
      this.zonaRadioX = 0;
      this.zonaRadioY = 0;
      return;
    }

    const rectCanvas = canvas.getBoundingClientRect();
    const rectContenido = contenido.getBoundingClientRect();

    this.zonaCentroX = rectContenido.left - rectCanvas.left + rectContenido.width / 2;
    this.zonaCentroY = rectContenido.top - rectCanvas.top + rectContenido.height / 2;
    this.zonaRadioX = rectContenido.width / 2 + 30;
    this.zonaRadioY = rectContenido.height / 2 + 30;
  }

  // Que tan "adentro" de la zona de texto esta un punto (elipse): <1 es
  // adentro, >=1 es afuera. Usarlo en vez de un rectangulo exacto alcanza
  // para que los nodos rodeen el texto sin taparlo.
  private profundidadEnZonaTexto(x: number, y: number): number {
    if (this.zonaRadioX <= 0 || this.zonaRadioY <= 0) {
      return 1;
    }

    const dx = (x - this.zonaCentroX) / this.zonaRadioX;
    const dy = (y - this.zonaCentroY) / this.zonaRadioY;

    return Math.hypot(dx, dy);
  }

  private generarNodos(): void {
    if (!this.ancho || !this.alto) {
      return;
    }

    const tipos: Nodo['tipo'][] = ['casa', 'corazon', 'persona', 'manos-corazon'];

    this.nodos = Array.from({ length: CANTIDAD_NODOS }, (_, i) => {
      let x = 0;
      let y = 0;

      for (let intento = 0; intento < 20; intento++) {
        x = Math.random() * this.ancho;
        y = Math.random() * this.alto;

        if (this.profundidadEnZonaTexto(x, y) >= 1) {
          break;
        }
      }

      return {
        x,
        y,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        tipo: tipos[i % tipos.length],
        fase: Math.random() * Math.PI * 2,
      };
    });

    this.pulsos = [];
  }

  private actualizar(): void {
    this.tiempo += 1;

    for (const nodo of this.nodos) {
      nodo.x += nodo.vx;
      nodo.y += nodo.vy;

      if (nodo.x < -20) nodo.x = this.ancho + 20;
      if (nodo.x > this.ancho + 20) nodo.x = -20;
      if (nodo.y < -20) nodo.y = this.alto + 20;
      if (nodo.y > this.alto + 20) nodo.y = -20;

      // Empuje suave para rodear el texto del hero en vez de taparlo.
      const profundidad = this.profundidadEnZonaTexto(nodo.x, nodo.y);

      if (profundidad < 1) {
        const angulo = Math.atan2(nodo.y - this.zonaCentroY, nodo.x - this.zonaCentroX);
        const fuerza = (1 - profundidad) * 6;

        nodo.x += Math.cos(angulo) * fuerza;
        nodo.y += Math.sin(angulo) * fuerza;
      }
    }

    // Cada tanto, un envio de ayuda "viaja" entre dos nodos conectados.
    if (this.tiempo % INTERVALO_PULSO_FRAMES === 0 && this.nodos.length > 1) {
      const desde = this.nodos[Math.floor(Math.random() * this.nodos.length)];
      const candidatos = this.nodos.filter(
        (n) => n !== desde && this.distancia(n, desde) < DISTANCIA_CONEXION,
      );

      if (candidatos.length) {
        const hasta = candidatos[Math.floor(Math.random() * candidatos.length)];
        this.pulsos.push({ desde, hasta, progreso: 0 });
      }
    }

    this.pulsos = this.pulsos
      .map((p) => ({ ...p, progreso: p.progreso + 0.018 }))
      .filter((p) => p.progreso <= 1);
  }

  private distancia(a: Nodo, b: Nodo): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private dibujarFrame(): void {
    const ctx = this.ctx;

    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, this.ancho, this.alto);

    for (let i = 0; i < this.nodos.length; i++) {
      for (let j = i + 1; j < this.nodos.length; j++) {
        const a = this.nodos[i];
        const b = this.nodos[j];
        const d = this.distancia(a, b);

        if (d < DISTANCIA_CONEXION) {
          const opacidad = 0.2 * (1 - d / DISTANCIA_CONEXION);
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacidad})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const pulso of this.pulsos) {
      const x = pulso.desde.x + (pulso.hasta.x - pulso.desde.x) * pulso.progreso;
      const y = pulso.desde.y + (pulso.hasta.y - pulso.desde.y) * pulso.progreso;
      const opacidad = Math.sin(pulso.progreso * Math.PI);

      ctx.beginPath();
      ctx.fillStyle = `rgba(${COLOR_ACENTO}, ${opacidad})`;
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const nodo of this.nodos) {
      this.dibujarNodo(nodo);
    }
  }

  private dibujarNodo(nodo: Nodo): void {
    const ctx = this.ctx!;
    const latido = 1 + Math.sin(this.tiempo * 0.05 + nodo.fase) * 0.12;

    ctx.save();
    ctx.translate(nodo.x, nodo.y);

    switch (nodo.tipo) {
      case 'casa':
        this.dibujarIcono(this.casaPath, TAMANO_ICONO * latido, 'rgba(255, 255, 255, 0.7)');
        break;
      case 'persona':
        this.dibujarIcono(
          this.personaPath,
          TAMANO_ICONO * latido,
          `rgba(${COLOR_PERSONA}, 0.85)`,
        );
        break;
      case 'corazon':
        this.dibujarIcono(
          this.corazonPath,
          TAMANO_CORAZON_SOLO * latido,
          `rgba(${COLOR_ACENTO}, 0.9)`,
        );
        break;
      case 'manos-corazon':
        this.dibujarIconoFuente(
          'volunteer_activism',
          TAMANO_ICONO * latido * 1.3,
          `rgba(${COLOR_ACENTO}, 0.9)`,
        );
        break;
    }

    ctx.restore();
  }

  private dibujarIcono(path: Path2D, tamano: number, color: string): void {
    const ctx = this.ctx!;
    const escala = tamano / 24;

    ctx.save();
    ctx.translate(-12 * escala, -12 * escala);
    ctx.scale(escala, escala);
    ctx.fillStyle = color;
    ctx.fill(path);
    ctx.restore();
  }

  // "Manos con corazon" no tiene un path propio: se dibuja con la ligadura
  // del mismo icono de Material ("volunteer_activism") que ya se usa en el
  // resto de la app (por ejemplo, en el login de ONG), asi no hay que
  // mantener path data de un icono complejo a mano.
  private dibujarIconoFuente(ligadura: string, tamano: number, color: string): void {
    const ctx = this.ctx!;

    ctx.save();
    ctx.font = `${tamano}px "Material Icons"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(ligadura, 0, 0);
    ctx.restore();
  }
}
