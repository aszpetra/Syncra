import { Routes } from '@angular/router';

export const routes: Routes = [
  {path: '', loadComponent: ()=> import('./pages/login/login.component').then(a => a.LoginComponent)},
  {path: 'dashboard', loadComponent: ()=> import('./pages/dashboard/dashboard.component').then(a => a.DashboardComponent)}
];
