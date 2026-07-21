import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-recurso-form',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './recurso-form.html',
  styleUrl: './recurso-form.scss',
})
export class RecursoForm {
  categorias: string[] = [
    'Salud',
    'Educación',
    'Alimentos',
    'Empleo',
    'Vivienda',
    'Asistencia comunitaria',
  ];
}