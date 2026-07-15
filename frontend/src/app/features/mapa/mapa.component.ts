import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <mat-card class="card">
      <mat-card-title>Mapa</mat-card-title>
      <mat-card-content>
        <p>Esta es la vista de mapa.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`.card { max-width: 480px; }`]
})
export class MapaComponent {}
