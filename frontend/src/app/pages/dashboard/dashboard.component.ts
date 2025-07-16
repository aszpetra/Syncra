import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { AuthService } from '../../sevices/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [FullCalendarModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit{
   private eventList: any;

  constructor(
    private router: Router,
    private auth: AuthService,
   
  ) {}

  ngOnInit(): void {
    console.log('oninit')
      this.auth.getDataFromGoogle().subscribe(
      (res) => {
        console.log('oninit res', res);
        this.eventList = res
      },
      (error) => {
        console.error('Google data request failed', error);
      }
    );
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
    events: [],
    height: 'auto'
  };

  logout() {
    // mock logout
    this.router.navigate(['/login']);
  }
}
