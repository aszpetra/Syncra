import { Component, Inject, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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
export class DashboardComponent{

  constructor(
    private router: Router
  ) {}

  logout() {
    localStorage.removeItem('tokens');
    this.router.navigate(['/login']);
  }
}
