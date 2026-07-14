import { Routes } from '@angular/router';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { LoginComponent } from './features/login/login.component';
import { MapaComponent } from './features/mapa/mapa.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'mapa', pathMatch: 'full' },
      { path: 'mapa', component: MapaComponent },
      { path: 'login', component: LoginComponent }
    ]
  }
];
