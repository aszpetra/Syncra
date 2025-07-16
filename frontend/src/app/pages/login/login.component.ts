declare const google: any;
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments';
import { AuthService } from '../../sevices/auth.service';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  private clientId = environment.googleClientId;
  private redirectUri = 'http://localhost:3000/auth';
  private scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email';

  constructor(
    private router: Router,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
      
  }

  loginWithGoogleCalendarAccess(): void {
      const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scope,
      access_type: 'offline',
      prompt: 'consent'
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
 
  }

  async handleCredentialResponse(response: any) {
    this.auth.loginWithGoogle(response.credential).subscribe(
      (res) => {
        console.log('login res', res)
        this.router.navigate(['/dashboard']);
      },
      (error) => {
        console.error('Google authentication failed', error);
      }
    );
  }  
}
