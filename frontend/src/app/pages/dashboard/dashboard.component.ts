import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../sevices/auth.service';

@Component({
  selector: 'app-dashboard',
 imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
   private authService = inject(AuthService);

  constructor(
    private router: Router
  ) {}

  logout() {
   this.authService.logout().subscribe({
        next: () => {
            this.router.navigate(['/login']);
        },
        error: (err) => {
            console.error('Logout error:', err);
            this.router.navigate(['/login']);
        }
    });
  }
}
