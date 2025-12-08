import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { AvailabilityService, CalendarItem } from '../../sevices/availability.service';

@Component({
  selector: 'app-handle-calendars',
  imports: [CommonModule, FormsModule],
  templateUrl: './handle-calendars.component.html',
  styleUrl: './handle-calendars.component.scss'
})
export class HandleCalendarsComponent {
  private toastr = inject(ToastrService);

  openCalendarSelection(): void {
    console.log('Dummy function called: Opening calendar selection/linking dialog...');
    this.toastr.info('This function is under development.');
  }

}
