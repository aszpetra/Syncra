import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authUrl = `${environment.apiBaseUrl}/auth`;
  private dataUrl = `${environment.apiBaseUrl}/data`;
  private http = inject(HttpClient);

  constructor() {}

  loginWithGoogle(token: string): Observable<any> {
    return this.http.post<any>(this.authUrl, { token });
  }

  getDataFromGoogle() {
    return this.http.get(this.dataUrl, { withCredentials: true });
  }
}