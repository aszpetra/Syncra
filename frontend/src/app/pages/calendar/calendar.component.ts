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


@Component({
  selector: 'app-calendar',
  imports: [FullCalendarModule, ClipboardModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent  implements OnInit{
  public bookingLink: string = ''; // Az URL megjelenítéséhez
  private clipboard = inject(Clipboard);

  constructor(
    private router: Router,
    private auth: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.auth.getDataFromGoogle().subscribe(
      res => {
        console.log('Calendar data:', res.calendar);

        const events = res.calendar.map((e: any) => ({
          title: e.summary,
          start: e.start.dateTime || e.start.date,
          end: e.end?.dateTime || e.end?.date,
        }));

        this.calendarOptions = {
          ...this.calendarOptions,
          events,
        };
      },
      err => {
        console.error('Failed to get data', err);
        this.router.navigate(['/login']);
      }
    );
    }
  }

  generateAndCopyLink(): void {
    this.auth.getTeacherIdForLink().subscribe({
      next: (response) => {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/booking/${response.teacherId}`;
        this.bookingLink = link;

        this.clipboard.copy(link);
        alert('Booking link copied to clipboard!');
      },
      error: (err) => {
        console.error('Failed to get teacher ID:', err);
        alert('Failed to generate link. Please log in again.');
      }
    });
  }

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
    businessHours: {
      daysOfWeek: [ 1, 2, 3, 4, 5 ],
      startTime: '8:00',
      endTime: '17:00',
    },
    headerToolbar: {
    left: 'prev,next',
    center: 'title',
    right: 'timeGridWeek,dayGridMonth'
    },
    height: 'auto'
  };
}
