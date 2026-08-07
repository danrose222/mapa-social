import { Routes } from '@angular/router';

import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { EstadisticasComponent } from './features/estadisticas/estadisticas.component';
import { NecesidadForm } from './features/formularios/necesidad-form/necesidad-form';
import { RecursoForm } from './features/formularios/recurso-form/recurso-form';
import { Inicio } from './features/inicio/inicio/inicio';
import { LoginComponent } from './features/login/login.component';
import { MapaComponent } from './features/mapa/mapa.component';
import { OrganizacionComponent } from './features/organizacion/organizacion.component';
import { RegistroOrganizacionComponent } from './features/registro-organizacion/registro-organizacion.component';
import { OrganizacionesPendientesComponent } from './features/organizaciones-pendientes/organizaciones-pendientes.component';
import { MisSolicitudesComponent } from './features/mis-solicitudes/mis-solicitudes.component';
import { SolicitudesRecibidasComponent } from './features/solicitudes-recibidas/solicitudes-recibidas.component';
import { PanelMunicipioComponent } from './features/panel-municipio/panel-municipio.component';

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
        path: 'estadisticas',
        component: EstadisticasComponent,
      },
      {
        path: 'organizacion/:nombre',
        component: OrganizacionComponent,
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
        path: 'registrar-organizacion',
        component: RegistroOrganizacionComponent,
      },
      {
        path: 'organizaciones-pendientes',
        component: OrganizacionesPendientesComponent,
        canActivate: [authGuard],
      },
      {
        path: 'mis-solicitudes',
        component: MisSolicitudesComponent,
        canActivate: [authGuard],
      },
      {
        path: 'solicitudes-recibidas',
        component: SolicitudesRecibidasComponent,
        canActivate: [authGuard],
      },
      {
        path: 'panel-municipio',
        component: PanelMunicipioComponent,
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
