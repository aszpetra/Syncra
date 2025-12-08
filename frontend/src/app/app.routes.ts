import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/login/login.component').then(a => a.LoginComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(a => a.LoginComponent)
  },
  {
    path: 'booking/:teacherId',
    loadComponent: () => import('./pages/booking/booking.component').then(a => a.BookingComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(a => a.DashboardComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/calendar/calendar.component').then(a => a.CalendarComponent),
        pathMatch: 'full'
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(a => a.SettingsComponent)
      },
      {
        path: 'handle-calendars',
        loadComponent: () => import('./pages/handle-calendars/handle-calendars.component').then(a => a.HandleCalendarsComponent)
      },
      {
        path: 'availability',
        loadComponent: () => import('./pages/availability/availability.component').then(a => a.AvailabilityComponent)
      }
    ]
  }
];
