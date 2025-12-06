import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'
import { FullCalendarModule } from '@fullcalendar/angular';
import { BookingService } from '../../sevices/booking.service';
import { ToastrService } from 'ngx-toastr';

interface Slot {
  start: string;
  end: string;
}

@Component({
  selector: 'app-booking',
  imports: [CommonModule, FormsModule, FullCalendarModule],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss'
})
export class BookingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private bookingService = inject(BookingService);
  private toastr = inject(ToastrService);

  teacherId: string = '';
  selectedDate: string = new Date().toISOString().split('T')[0];

  availability: Slot[] = [];
  groupedAvailability: { [key: string]: Slot[] } = {}

  bookingDetails = {
    clientName: '',
    clientEmail: '',
    notes: '',
    slot: null as Slot | null
  };

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.teacherId = params.get('teacherId') || '';
      if (this.teacherId) {
        this.fetchAvailability();
      }
    });
  }

  fetchAvailability(): void {
    this.bookingService.getPublicAvailability(this.teacherId).subscribe({
      next: (response) => {
        this.availability = response.availableSlots;
        this.groupSlotsByDate();
      },
      error: (err) => console.error('Error fetching availability:', err)
    });
  }

  groupSlotsByDate(): void {
    this.groupedAvailability = this.availability.reduce((groups, slot) => {
      const date = slot.start.split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(slot);
      return groups;
    }, {} as { [key: string]: Slot[] });
  }

  onDateChange(event: Event): void {
    const dateString = (event.target as HTMLInputElement).value;
    this.selectedDate = dateString;
    this.bookingDetails.slot = null;
  }

  selectSlot(slot: Slot): void {
    this.bookingDetails.slot = slot;
  }

  submitBooking(): void {
    if (this.bookingDetails.slot) {
      this.toastr.success('Booking submitted successfully!', 'Success');
    } else {
      this.toastr.error('Please select a time slot.', 'Error');
    }
  }
}
