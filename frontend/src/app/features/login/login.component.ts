import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../core/services/auth.service';

type PerfilLogin = 'persona' | 'comunidad' | 'ong' | 'moderador';

// El navbar manda ?tipo= segun que perfil elija quien todavia no inicio
// sesion (persona/comunidad/ong/moderador): solo cambia el texto/icono de
// esta pantalla y, si corresponde, el link para crear la cuenta; el login
// en si es el mismo formulario y endpoint para todos los roles.
const COPIA_POR_PERFIL: Record<
  PerfilLogin,
  { titulo: string; icono: string; registro?: string }
> = {
  persona: {
    titulo: 'Iniciar sesión como usuario',
    icono: 'person',
  },
  comunidad: {
    titulo: 'Iniciar sesión como comunidad',
    icono: 'home',
    registro: 'comunidad',
  },
  ong: {
    titulo: 'Iniciar sesión como ONG',
    icono: 'volunteer_activism',
    registro: 'ong',
  },
  moderador: {
    titulo: 'Iniciar sesión como municipio',
    icono: 'account_balance',
    registro: 'moderador',
  },
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // El navbar reutiliza el mismo componente al pasar de /login?tipo=comunidad
  // a /login?tipo=ong (Angular no recrea la ruta si solo cambia el query
  // param), asi que leer route.snapshot una sola vez dejaba la pantalla
  // pisada con el primer perfil hasta refrescar. toSignal sigue el
  // observable de queryParamMap y se actualiza en cada navegacion.
  private readonly tipoParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('tipo'))),
    { initialValue: this.route.snapshot.queryParamMap.get('tipo') },
  );

  readonly perfil = computed<PerfilLogin>(() => {
    const tipo = this.tipoParam();

    return tipo === 'comunidad' || tipo === 'ong' || tipo === 'moderador'
      ? tipo
      : 'persona';
  });

  readonly copiaPerfil = computed(() => COPIA_POR_PERFIL[this.perfil()]);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  showPassword = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService.login(email!, password!).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigateByUrl('/');
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(
          error.status === 401
            ? 'Los datos ingresados son incorrectos.'
            : 'No se pudo iniciar sesión. Intentá de nuevo más tarde.',
        );
      },
    });
  }
}
