import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-necesidad-form',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './necesidad-form.html',
  styleUrl: './necesidad-form.scss',
})
export class NecesidadForm {
  categorias: string[] = [
    'Salud',
    'Educación',
    'Alimentos',
    'Empleo',
    'Vivienda',
    'Asistencia comunitaria',
  ];
}