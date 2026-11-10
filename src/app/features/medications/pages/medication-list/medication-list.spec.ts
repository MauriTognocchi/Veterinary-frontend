import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicationList } from './medication-list';

describe('MedicationList', () => {
  let component: MedicationList;
  let fixture: ComponentFixture<MedicationList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicationList],
    }).compileComponents();

    fixture = TestBed.createComponent(MedicationList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
