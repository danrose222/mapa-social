import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

// Revela el elemento (agregando .is-revealed -- los estilos de quien la usa
// definen de qué "no revelado" se parte) la primera vez que entra en
// viewport, una sola vez -- no vuelve a esconderlo si se sale de vista. Con
// prefers-reduced-motion directamente lo marca revelado sin esperar el
// scroll, no hay nada que animar.
@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const element = this.el.nativeElement;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.classList.add('is-revealed');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            element.classList.add('is-revealed');
            this.observer?.unobserve(element);
          }
        }
      },
      { threshold: 0.15 },
    );

    this.observer.observe(element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
