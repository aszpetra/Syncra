import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BookingService } from '../../sevices/booking.service';
import { forkJoin } from 'rxjs';

interface CalendarItem {
  id: string;
  name: string;
  isPrimary: boolean;
  backgroundColor?: string;
}

@Component({
  selector: 'app-handle-calendars',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './handle-calendars.component.html',
  styleUrl: './handle-calendars.component.scss'
})
export class HandleCalendarsComponent implements OnInit {
  private bookingService = inject(BookingService);
  private toastr = inject(ToastrService);

  calendarList: CalendarItem[] = [];
  selectedBlockingCalendars: string[] = [];
  savingCalendarId: string = '';

  isLoading = true;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;

    forkJoin({
      calendarsResponse: this.bookingService.listUserCalendars(),
      settingsResponse: this.bookingService.getBlockingCalendars()
    }).subscribe({
      next: (result) => {
        this.calendarList = result.calendarsResponse.calendars.map((cal: any) => ({
          id: cal.id,
          name: cal.summary,
          isPrimary: cal.primary,
          backgroundColor: cal.backgroundColor
        }));
        const savedBlockingIds = result.settingsResponse.blockingCalendarIds || [];
        this.savingCalendarId = result.settingsResponse.bookingCalendarId;

        if (savedBlockingIds.length > 0) {
            this.selectedBlockingCalendars = savedBlockingIds;
        } else {
            const primaryCal = this.calendarList.find(c => c.isPrimary);
            if (primaryCal) {
                this.selectedBlockingCalendars = [primaryCal.id];
            }
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Hiba az adatok betöltésekor:', error);
        this.isLoading = false;
      }
    });
  }

  toggleBlockingCalendar(calendarId: string, event: any): void {
    const isChecked = event.target.checked;
    if (isChecked) {
      this.selectedBlockingCalendars.push(calendarId);
    } else {
      this.selectedBlockingCalendars = this.selectedBlockingCalendars.filter(id => id !== calendarId);
    }
  }

  saveSettings(): void {
    this.isLoading = true;

    this.bookingService.saveSelectedCalendars({ blockingIds: this.selectedBlockingCalendars, bookingId: this.savingCalendarId }).subscribe({
      next: (response) => {
        this.toastr.success('Saved successfully!');
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Hiba a mentés során:', error);
        this.toastr.error('Failed to save calendar settings.');
        this.isLoading = false;
      }
    });
  }
}
