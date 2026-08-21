import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { moderatorGuard } from './core/guards/moderator.guard';
import { roleGuard } from './guards/role-guard'; // 👈 Ruta real respetada
import { AppShellComponent } from './layout/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/inicio/inicio.component').then((m) => m.InicioComponent),
      },
      {
        path: 'mapa',
        loadComponent: () =>
          import('./pages/mapa/mapa-home.component').then((m) => m.MapaHomeComponent),
      },
      // --- DASHBOARDS Y PANELES POR ROL ---
      {
        path: 'dashboard-organizacion',
        canActivate: [roleGuard(['ong', 'comunidad', 'municipio'])],
        loadComponent: () =>
          import('./pages/dashboard-organizacion/dashboard-organizacion').then(
            (m) => m.DashboardOrganizacion,
          ),
      },
      {
        path: 'dashboard-moderador',
        canActivate: [roleGuard(['moderador'])],
        loadComponent: () =>
          import('./pages/dashboard-moderador/dashboard-moderador').then(
            (m) => m.DashboardModeradorComponent,
          ),
      },
      // ------------------------------------
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
        path: 'estadisticas',
        canActivate: [moderatorGuard],
        loadComponent: () =>
          import('./pages/estadisticas/estadisticas.component').then(
            (m) => m.EstadisticasComponent,
          ),
      },
      {
        path: 'quienes-somos',
        loadComponent: () =>
          import('./pages/quienes-somos/quienes-somos.component').then(
            (m) => m.QuienesSomosComponent,
          ),
      },
      {
        path: 'publicar/ofrecer-recurso',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/ofrecer-recurso/ofrecer-recurso.component').then(
            (m) => m.OfrecerRecursoComponent,
          ),
      },
      {
        path: 'mis-solicitudes',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/mis-solicitudes/mis-solicitudes.component').then(
            (m) => m.MisSolicitudesComponent,
          ),
      },
      {
        path: 'mis-publicaciones',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/mis-publicaciones/mis-publicaciones.component').then(
            (m) => m.MisPublicacionesComponent,
          ),
      },
      {
        path: 'organizacion/mi-organizacion',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/organizacion/mi-organizacion/mi-organizacion.component').then(
            (m) => m.MiOrganizacionComponent,
          ),
      },
      {
        path: 'organizacion/crear',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/organizacion/crear/crear-organizacion.component').then(
            (m) => m.CrearOrganizacionComponent,
          ),
      },
      {
        path: 'organizacion/:id',
        loadComponent: () =>
          import('./pages/organizacion/perfil/organizacion-perfil.component').then(
            (m) => m.OrganizacionPerfilComponent,
          ),
      },
      {
        path: 'moderador/publicaciones',
        canActivate: [moderatorGuard],
        loadComponent: () =>
          import('./pages/moderador/publicaciones/publicaciones-moderador.component').then(
            (m) => m.PublicacionesModeradorComponent,
          ),
      },
      {
        path: 'moderador/organizaciones',
        canActivate: [moderatorGuard],
        loadComponent: () =>
          import('./pages/moderador/organizaciones/organizaciones-moderador.component').then(
            (m) => m.OrganizacionesModeradorComponent,
          ),
      },
      {
        path: 'moderador/mis-localidades',
        canActivate: [moderatorGuard],
        loadComponent: () =>
          import('./pages/moderador/mis-localidades/mis-localidades.component').then(
            (m) => m.MisLocalidadesComponent,
          ),
      },
      {
        path: 'entrar',
        loadComponent: () =>
          import('./pages/login/login.component').then((m) => m.LoginComponent),
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
    ],
  },
];