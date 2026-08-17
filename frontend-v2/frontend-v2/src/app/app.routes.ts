import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/mapa/mapa-home.component').then((m) => m.MapaHomeComponent),
  },
  {
    path: 'publicar',
    loadComponent: () =>
      import('./pages/publicar/publicar-choice.component').then(
        (m) => m.PublicarChoiceComponent,
      ),
  },
  {
    path: 'publicar/necesito-ayuda',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/necesito-ayuda/necesito-ayuda.component').then(
        (m) => m.NecesitoAyudaComponent,
      ),
  },
  {
    path: 'publicar/quiero-ayudar',
    loadComponent: () =>
      import('./pages/quiero-ayudar/quiero-ayudar.component').then(
        (m) => m.QuieroAyudarComponent,
      ),
  },
  {
    path: 'publicar/quiero-ayudar/:id',
    loadComponent: () =>
      import('./pages/detalle-solicitud/detalle-solicitud.component').then(
        (m) => m.DetalleSolicitudComponent,
      ),
  },
  {
    path: 'entrar',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./pages/registro/registro.component').then((m) => m.RegistroComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
