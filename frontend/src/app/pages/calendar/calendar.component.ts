import { Component, inject, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { AuthService } from '../../sevices/auth.service';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { ToastrService } from 'ngx-toastr';
import { AvailabilityService, DayAvailability, Slot } from '../../sevices/availability.service';
import { take } from 'rxjs/operators';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-calendar',
  imports: [FullCalendarModule, ClipboardModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent  implements OnInit{
  public bookingLink: string = '';
  private teacherId: string = '';
  private clipboard = inject(Clipboard);
  private availabilityService = inject(AvailabilityService);
  private toastr = inject(ToastrService);


  calendarOptions: any = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    nowIndicator: true,
    firstDay: 1,
    slotMinTime: '06:00:00',
    slotMaxTime: '22:00:00',
    scrollTime: '08:00:00',
    allDaySlot: false,
    selectable: true,
    businessHours: [],
    headerToolbar: {
      left: 'prev,next',
      center: 'title',
      right: 'timeGridWeek,dayGridMonth'
    },
    height: 'auto'
  };

  constructor(
    private router: Router,
    private auth: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.auth.getTeacherId().pipe(take(1)).subscribe({
        next: (response) => {
          this.teacherId = response.teacherId;
          this.loadCalendarData(this.teacherId);
        },
        error: (err) => {
          console.error('Hiba a tanár ID lekérésekor', err);
          this.router.navigate(['/login']);
        }
      });
    }
  }

  loadCalendarData(teacherId: string): void {
    const events$ = this.auth.getDataFromGoogle();
    const availability$ = this.availabilityService.getAvailability(teacherId);

    combineLatest([events$, availability$]).pipe(take(1)).subscribe({
      next: ([eventRes, availRes]) => {
        const events = this.processGoogleEvents(eventRes.calendar);
        const businessHours = this.convertAvailabilityToBusinessHours(availRes.weeklyAvailability);

        this.calendarOptions = {
          ...this.calendarOptions,
          events: events,
          businessHours: businessHours,
        };
      },
      error: (err) => {
        console.error('Hiba a naptár adatok lekérésekor', err);
      }
    });
  }
  private processGoogleEvents(calendarEvents: any[]): any[] {
    const BOOKING_KEYWORD = 'SYNCRA_BOOKING';

    return calendarEvents.map((e: any) => {
      const isAppBooked = e.description?.includes(BOOKING_KEYWORD) || e.summary?.includes(BOOKING_KEYWORD);

      let eventConfig: any = {
        start: e.start.dateTime || e.start.date,
        end: e.end?.dateTime || e.end?.date,
        display: 'block',

        title: isAppBooked ? e.summary : 'BUSY',
        color: isAppBooked ? '#5031ceff' : '#4A5568',
        textColor: 'white',
      };

      return eventConfig;
    });
  }

  private convertAvailabilityToBusinessHours(availability: DayAvailability[]): any[] {
    if (!availability || availability.length === 0) {
      return [];
    }

    const businessHours: any[] = [];

    const grouped = availability.reduce((acc, day) => {
      acc[day.dayOfWeek] = day.slots;
      return acc;
    }, {} as { [key: number]: Slot[] });

    for (const dayOfWeek in grouped) {
      grouped[dayOfWeek].forEach(slot => {
        businessHours.push({
          daysOfWeek: [Number(dayOfWeek)],
          startTime: slot.startTime,
          endTime: slot.endTime
        });
      });
    }

    return businessHours;
  }

  generateAndCopyLink(): void {
    this.auth.getTeacherId().subscribe({
      next: (response) => {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/booking/${response.teacherId}`;
        this.bookingLink = link;

        this.clipboard.copy(link);
        this.toastr.success('Booking link copied to clipboard!', 'Success');
      },
      error: (err) => {
        console.error('Failed to get teacher ID:', err);
        this.toastr.error('Failed to generate link. Please log in again.', 'Error');
      }
    });
  }
}
