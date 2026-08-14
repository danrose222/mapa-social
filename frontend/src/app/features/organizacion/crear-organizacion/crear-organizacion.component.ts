import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

interface Organization {
  id: number;
  name: string;
  type: string;
  ciudad: string;
  verified: boolean;
  description?: string;
  contactInfo?: string;
  address?: string;
}

interface MiPerfil {
  id: number;
  organizationId?: number;
  organization?: Organization;
}

// Punto de partida (rama feature/organizacion-crear-formulario, sobre la
// base de feature/organizations-and-contact-visibility para tener
// GET /users/me disponible): resuelve el bloqueo de fondo -- hoy no hay
// ninguna forma en el frontend real de crear una Organization, así que
// nada de lo que depende de que existan organizaciones (perfil público,
// panel de moderación, publicar recursos) se puede ni probar. Falta
// pulir: reemplazar el campo de ciudad por un selector real de
// municipios (mismo patrón que ya está resuelto en el fork de Corazones
// Unidos, adaptado a este DTO), y manejar mejor el caso de que
// GET /users/me todavía no exista si esto se prueba contra develop antes
// de que el PR #43 se mergee.
@Component({
  selector: 'app-crear-organizacion',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
  ],
  templateUrl: './crear-organizacion.component.html',
  styleUrl: './crear-organizacion.component.scss',
})
export class CrearOrganizacionComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly miOrganizacion = signal<Organization | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    type: ['comunidad', [Validators.required]],
    ciudad: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(1000)]],
    contactInfo: ['', [Validators.maxLength(255)]],
    address: ['', [Validators.maxLength(255)]],
  });

  ngOnInit(): void {
    this.cargarMiPerfil();
  }

  private cargarMiPerfil(): void {
    this.isLoading.set(true);

    this.http.get<MiPerfil>('/api/users/me').subscribe({
      next: (perfil) => {
        this.miOrganizacion.set(perfil.organization ?? null);
        this.isLoading.set(false);
      },
      error: () => {
        // Si GET /users/me todavía no existe en la rama contra la que se
        // prueba esto (por ejemplo, developing contra develop antes de
        // que el PR #43 se mergee), no rompemos la pantalla: mostramos
        // directamente el formulario de creación.
        this.isLoading.set(false);
      },
    });
  }

  crear(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Revisá los campos obligatorios antes de continuar.');
      return;
    }

    const { description, contactInfo, address, ...resto } = this.form.getRawValue();

    const payload = {
      ...resto,
      description: description.trim() || undefined,
      contactInfo: contactInfo.trim() || undefined,
      address: address.trim() || undefined,
    };

    this.isSubmitting.set(true);

    this.http.post<Organization>('/api/organizations', payload).subscribe({
      next: (organizacion) => {
        this.isSubmitting.set(false);
        this.miOrganizacion.set(organizacion);
        this.successMessage.set(
          'Tu organización se creó correctamente. Ahora un moderador de tu ciudad tiene que avalarla.',
        );
      },
      error: (error) => {
        this.isSubmitting.set(false);

        if (error.status === 401) {
          this.errorMessage.set('Necesitás iniciar sesión para crear una organización.');
          return;
        }

        this.errorMessage.set(
          error.error?.message ?? 'No se pudo crear la organización. Intentá nuevamente.',
        );
      },
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);

    return Boolean(
      control && control.invalid && (control.touched || control.dirty),
    );
  }
}
