import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'
import { FullCalendarModule } from '@fullcalendar/angular';
import { BookingService } from '../../sevices/booking.service';

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
  // private bookingService = inject(BookingService); // Éles logikához kell majd

  teacherId: string = '';
  selectedDate: string = new Date().toISOString().split('T')[0]; // Mai dátum YYYY-MM-DD formátumban

  // Üres tömb a szabad slotoknak
  availability: Slot[] = [];
  groupedAvailability: { [key: string]: Slot[] } = {}

  // A felhasználó által kitöltött űrlap adatok
  bookingDetails = {
    clientName: '',
    clientEmail: '',
    notes: '',
    slot: null as Slot | null // A kiválasztott slot
  };

  ngOnInit(): void {
    // 1. Olvasd ki a teacherId-t az URL-ből
    this.route.paramMap.subscribe(params => {
      this.teacherId = params.get('teacherId') || '';
      if (this.teacherId) {
        // fetchAvailability() - Éles hívás itt történne
        this.fetchAvailability();
      }
    });
  }

  fetchAvailability(): void {
    this.bookingService.getPublicAvailability(this.teacherId).subscribe({
      next: (response) => {
        this.availability = response.availableSlots;
        this.groupSlotsByDate(); // Hívjuk meg a csoportosítást
      },
      error: (err) => console.error('Error fetching availability:', err)
    });
  }

  // ÚJ: Csoportosító függvény
  groupSlotsByDate(): void {
    this.groupedAvailability = this.availability.reduce((groups, slot) => {
      // Feltételezve, hogy a backend a "dateKey"-ben adja vissza YYYY-MM-DD-t
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
    this.bookingDetails.slot = null; // Töröljük a slotot, ha dátumot váltott
    // Éles logikához: fetchAvailability()
  }

  selectSlot(slot: Slot): void {
    this.bookingDetails.slot = slot;
  }

  submitBooking(): void {
    if (this.bookingDetails.slot) {
      console.log('Booking submitted:', this.bookingDetails);
      // Következő lépésben: this.bookingService.submitBooking(...) hívás jön ide
    } else {
      alert('Please select a time slot.');
    }
  }


}
