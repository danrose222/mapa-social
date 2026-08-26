import { Component, EventEmitter, Input, Output } from '@angular/core';

// Los tres modales de la app (colaborar, necesidad rápida, solicitud de
// recurso) repetían byte a byte el mismo backdrop + caja + botón de
// cerrar, cada uno con su propio prefijo de clase CSS. Lo que sigue
// siendo de cada uno -- la alerta de error (su posición relativa al
// resto del contenido varía por modal), el formulario, el resumen, la
// pantalla de éxito -- se proyecta acá adentro con <ng-content>; eso
// varía lo suficiente entre los tres (un toast que se autocierra vs. una
// pantalla de éxito completa, campos totalmente distintos) como para no
// forzarlo a esta forma compartida.
@Component({
  selector: 'app-modal-shell',
  standalone: true,
  imports: [],
  templateUrl: './modal-shell.component.html',
  styleUrl: './modal-shell.component.scss',
})
export class ModalShellComponent {
  @Input() maxWidth = 420;
  // false durante una pantalla de éxito que ya trae su propio cierre (el
  // toast de resource-request-modal se autocierra solo, y las pantallas
  // de éxito de los otros dos tienen su propio botón "Cerrar" de ancho
  // completo) -- mostrar la ✕ arriba a la derecha ahí sería redundante.
  @Input() showCloseButton = true;

  @Output() readonly closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
