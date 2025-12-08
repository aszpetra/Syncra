import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments';
import { Observable } from 'rxjs';

export interface Slot { startTime: string; endTime: string; }
export interface DayAvailability { dayOfWeek: number; slots: Slot[]; }
export interface AvailabilityResponse { weeklyAvailability: DayAvailability[]; }

export interface CalendarItem {
    id: string;
    name: string;
    isPrimary: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AvailabilityService {
  private apiBaseUrl = environment.apiBaseUrl;
  private http = inject(HttpClient);

  getAvailability(teacherId: string): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/availability/${teacherId}`, { withCredentials: true });
  }

  saveAvailability(teacherId: string, weeklyAvailability: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/availability`, { teacherId, weeklyAvailability }, { withCredentials: true });
  }
}
