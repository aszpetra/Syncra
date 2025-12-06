// frontend/src/app/sevices/booking.service.ts

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class BookingService {
  private apiBaseUrl = environment.apiBaseUrl;
  private http = inject(HttpClient);

  getPublicAvailability(teacherId: string): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/public/availability/${teacherId}`);
  }

  submitBooking(bookingData: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/public/book`, bookingData);
  }

  blockTime(blockData: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/api/availability/block`, blockData, { withCredentials: true });
  }

  listUserCalendars(): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/api/calendars/list`, { withCredentials: true });
  }

  saveSelectedCalendars(ids: string[]): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/api/calendars/select`, { selectedCalendarIds: ids }, { withCredentials: true });
  }
}
