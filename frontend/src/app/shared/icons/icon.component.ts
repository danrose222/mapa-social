import { Component, Input } from '@angular/core';

const PATHS: Record<string, string> = {
  heart: 'M12 21s-7.5-4.6-10-9.1C.5 8.6 2 5 5.5 5c2 0 3.4 1.1 4.5 2.6C11.1 6.1 12.5 5 14.5 5 18 5 19.5 8.6 22 11.9 19.5 16.4 12 21 12 21Z',
  check: 'M20 6 9 17l-5-5',
  pin: 'M12 21s7-6.8 7-12a7 7 0 1 0-14 0c0 5.2 7 12 7 12Z M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  phone: 'M6.6 10.8c1.4 2.7 3.6 4.9 6.3 6.3l2.1-2.1c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1L6.6 10.8Z',
  mail: 'M3 6h18v12H3z M3 7l9 6 9-6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3.5 2',
  hands: 'M8 12V5a2 2 0 1 1 4 0v6 M12 11V4a2 2 0 1 1 4 0v8 M16 12V6a2 2 0 1 1 4 0v8c0 4-3 8-8 8s-8-3-8-7v-3a2 2 0 1 1 4 0v1',
  helpingHand: 'M11 13.5 8.5 11a2 2 0 0 0-2.8 2.8L9 17.1a3 3 0 0 0 2.1.9h6.4a2 2 0 0 0 2-2v-.3 M17 12.5V7a2 2 0 1 0-4 0v3.5 M13 6.5V6a2 2 0 1 0-4 0v3',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  building: 'M4 21V7l8-4 8 4v14 M9 21v-6h6v6 M9 11h.01 M15 11h.01 M9 15h.01 M15 15h.01',
  arrowLeft: 'M19 12H5 M12 19l-7-7 7-7',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      [attr.stroke]="filled ? 'none' : 'currentColor'"
      [attr.fill]="filled ? 'currentColor' : 'none'"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path [attr.d]="path" />
    </svg>
  `,
})
export class IconComponent {
  @Input() name: keyof typeof PATHS = 'heart';
  @Input() size = 18;
  @Input() filled = false;

  get path(): string {
    return PATHS[this.name] ?? '';
  }
}
