import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicationForm } from './medication-form';

describe('MedicationForm', () => {
  let component: MedicationForm;
  let fixture: ComponentFixture<MedicationForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicationForm],
    }).compileComponents();

    fixture = TestBed.createComponent(MedicationForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
