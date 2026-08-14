import { Routes } from '@angular/router';

import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { moderatorGuard } from './core/guards/moderator.guard';

import { NecesidadForm } from './features/formularios/necesidad-form/necesidad-form';
import { RecursoForm } from './features/formularios/recurso-form/recurso-form';
import { Inicio } from './features/inicio/inicio/inicio';
import { LoginComponent } from './features/login/login.component';
import { MapaComponent } from './features/mapa/mapa.component';
import { Organizations } from './features/moderador/organizations/organizations';
import { Register } from './features/register/register/register';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        component: Inicio,
      },
      {
        path: 'mapa',
        component: MapaComponent,
      },
      {
        path: 'registrar-necesidad',
        component: NecesidadForm,
        canActivate: [authGuard],
      },
      {
        path: 'ofrecer-recurso',
        component: RecursoForm,
        canActivate: [authGuard],
      },
      {
        path: 'moderador/organizaciones',
        component: Organizations,
        canActivate: [authGuard, moderatorGuard],
      },
      {
        path: 'registro',
        component: Register,
      },
      {
        path: 'login',
        component: LoginComponent,
      },
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];