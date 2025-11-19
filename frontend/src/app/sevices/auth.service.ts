import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authUrl = `${environment.apiBaseUrl}/auth`;
  private dataUrl = `${environment.apiBaseUrl}/data`;
  private http = inject(HttpClient);


  constructor(private router: Router) {}

  getDataFromGoogle(): Observable<{calendar: any}> {
    return this.http.get<{calendar: any}>(this.dataUrl, {
      withCredentials: true
    });
  }
}
