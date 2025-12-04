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

  // --- 1. & 2. Public Booking (Nincs withCredentials, mert publikus) ---
  getPublicAvailability(teacherId: string): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/public/availability/${teacherId}`);
  }

  submitBooking(bookingData: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/public/book`, bookingData);
  }

  // --- 3. Private Availability (Session szükséges: withCredentials: true) ---
  getAvailabilitySettings(): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/api/availability/settings`, { withCredentials: true });
  }

  saveAvailabilitySettings(rules: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/api/availability/settings`, rules, { withCredentials: true });
  }

  blockTime(blockData: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/api/availability/block`, blockData, { withCredentials: true });
  }

  // --- 4. Private Calendar Integration (Session szükséges) ---
  listUserCalendars(): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/api/calendars/list`, { withCredentials: true });
  }

  saveSelectedCalendars(ids: string[]): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/api/calendars/select`, { selectedCalendarIds: ids }, { withCredentials: true });
  }
}
