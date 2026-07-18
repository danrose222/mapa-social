import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { MapaComponent } from './features/mapa/mapa.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'auth',
    children: [
      { path: '', redirectTo: '/login', pathMatch: 'full' },
      { path: 'login', redirectTo: '/login', pathMatch: 'full' },
      { path: 'register', redirectTo: '/register', pathMatch: 'full' },
    ],
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'mapa', pathMatch: 'full' },
      { path: 'mapa', component: MapaComponent, canActivate: [AuthGuard] },
    ],
  },
];
