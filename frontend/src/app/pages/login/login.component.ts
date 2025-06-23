import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private router = inject(Router);


   mockLogin() {
    console.log('Mock login successful');
    this.router.navigate(['/dashboard']);
  }

  mockRegister() {
    console.log('Mock registration successful');
    this.router.navigate(['/dashboard']);
  }
}
