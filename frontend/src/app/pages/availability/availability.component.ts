import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs/internal/operators/take';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { AvailabilityService, DayAvailability, Slot } from '../../sevices/availability.service';
import { AuthService } from '../../sevices/auth.service';

@Component({
  selector: 'app-availabilty',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './availability.component.html',
  styleUrl: './availability.component.scss'
})
export class AvailabilityComponent {
  availabilityForm!: FormGroup;
  private availabilityService = inject(AvailabilityService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  private teacherId: string = '';

  daysOfWeek = [
    { index: 1, name: 'Monday' },
    { index: 2, name: 'Tuesday' },
    { index: 3, name: 'Wednesday' },
    { index: 4, name: 'Thursday' },
    { index: 5, name: 'Friday' },
    { index: 6, name: 'Saturday' },
    { index: 0, name: 'Sunday' }
  ];

  constructor(private fb: FormBuilder) {
    this.initializeForm();
  }

  getDayName(dayIndex: number): string {
    const day = this.daysOfWeek.find(d => d.index === dayIndex);
    return day ? day.name : 'Unknown day';
}

  ngOnInit(): void {
    this.authService.getTeacherId().pipe(take(1)).subscribe({
      next: (response) => {
        this.teacherId = response.teacherId;
        this.loadAvailability(this.teacherId);
      },
      error: (err) => console.error('Error fetching teacher ID', err)
    });

  }

  loadAvailability(teacherId: string): void {
    this.availabilityService.getAvailability(teacherId).subscribe({
      next: (response) => {
        const storedAvailability: DayAvailability[] = response.weeklyAvailability;

        if (storedAvailability && storedAvailability.length > 0) {
          this.weeklyAvailability.clear();
          const sortedDays = [1, 2, 3, 4, 5, 6, 0];

          sortedDays.forEach(dayIndex => {
            const dayData = storedAvailability.find(day => day.dayOfWeek === dayIndex);
            this.weeklyAvailability.push(this.createDayGroup(dayIndex, dayData ? dayData.slots : []));
          });
        }
      },
      error: (error) => {
        console.error('Failed to load availability. Using default data.', error);
      }
    });
  }

  private createSlotGroup(startTime: string = '', endTime: string = ''): FormGroup {
    return this.fb.group({
      startTime: [startTime, Validators.required],
      endTime: [endTime, Validators.required]
    });
  }

private initializeForm(): void {
    const weeklyAvailabilityArray: FormArray<FormGroup> = this.fb.array<FormGroup>([]);
    const sortedDays = [1, 2, 3, 4, 5, 6, 0];

    sortedDays.forEach(dayIndex => {
      weeklyAvailabilityArray.push(this.createDayGroup(dayIndex, []) as FormGroup);
    });

    this.availabilityForm = this.fb.group({
      weeklyAvailability: weeklyAvailabilityArray
    });
  }

  private createDayGroup(dayIndex: number, slots: Slot[]): FormGroup {
    const slotArray = this.fb.array<FormGroup>(slots.map(slot => this.createSlotGroup(slot.startTime, slot.endTime)));

     return this.fb.group({
      dayOfWeek: [dayIndex],
      slots: slotArray
    });
  }

  createInitialAvailability(): FormGroup[] {
    return this.daysOfWeek.map(day =>
      this.fb.group({
        dayOfWeek: [day.index],
        slots: this.fb.array([this.createTimeSlot()])
      })
    );
  }

  createTimeSlot(): FormGroup {
    return this.fb.group({
      startTime: ['09:00', Validators.required],
      endTime: ['17:00', Validators.required]
    });
  }

  get weeklyAvailability(): FormArray {
    return this.availabilityForm.get('weeklyAvailability') as FormArray;
  }

  getSlotsForDay(dayIndex: number): FormArray {
    const dayGroup = this.weeklyAvailability.controls.find(
      (control: any) => control.value.dayOfWeek === dayIndex
    );
    return dayGroup ? dayGroup.get('slots') as FormArray : this.fb.array([]);
  }

  addTimeSlot(dayIndex: number): void {
    const slots = this.getSlotsForDay(dayIndex);
    slots.push(this.createTimeSlot());
  }

  removeTimeSlot(dayIndex: number, slotIndex: number): void {
    const slots = this.getSlotsForDay(dayIndex);
    slots.removeAt(slotIndex);
  }

  onSubmit(): void {
    if (this.availabilityForm.valid) {
      const formValue = this.availabilityForm.value;

      const dataToSave: DayAvailability[] = formValue.weeklyAvailability
        .map((dayGroup: DayAvailability) => ({
            ...dayGroup,
            slots: dayGroup.slots.filter((slot: Slot) => slot.startTime && slot.endTime)
        }))
        .filter((dayGroup: DayAvailability) => dayGroup.slots && dayGroup.slots.length > 0);

      if (dataToSave.length === 0) {
        this.toastr.warning('No time slots to save!', 'Warning');
        return;
      }

      this.availabilityService.saveAvailability(this.teacherId, dataToSave).pipe(take(1)).subscribe({
        next: (response) => {
          this.toastr.success('Az adatok sikeresen frissültek!', 'Siker');
        },
        error: (error) => {
          this.toastr.error('Failed to save availability.', 'Error');
        }
      });
    }
  }
}
