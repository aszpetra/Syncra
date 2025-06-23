import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

@Component({
  selector: 'app-dashboard',
  imports: [FullCalendarModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private router = inject(Router);
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
      daysOfWeek: [ 1, 2, 3, 4 ],
      startTime: '8:00',
      endTime: '17:00',
    },
    headerToolbar: {
    left: 'prev,next',
    center: 'title',
    right: 'timeGridWeek,dayGridMonth'
    },
    events: [],
    height: 'auto'
  };

  logout() {
    // mock logout
    this.router.navigate(['/login']);
  }
}
