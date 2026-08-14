import { Routes } from '@angular/router';

import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { NecesidadForm } from './features/formularios/necesidad-form/necesidad-form';
import { RecursoForm } from './features/formularios/recurso-form/recurso-form';
import { Inicio } from './features/inicio/inicio/inicio';
import { LoginComponent } from './features/login/login.component';
import { MapaComponent } from './features/mapa/mapa.component';
import { CrearOrganizacionComponent } from './features/organizacion/crear-organizacion/crear-organizacion.component';

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
        path: 'mi-organizacion',
        component: CrearOrganizacionComponent,
        canActivate: [authGuard],
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