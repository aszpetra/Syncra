import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HandleCalendarsComponent } from './handle-calendars.component';

describe('HandleCalendarsComponent', () => {
  let component: HandleCalendarsComponent;
  let fixture: ComponentFixture<HandleCalendarsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HandleCalendarsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HandleCalendarsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
