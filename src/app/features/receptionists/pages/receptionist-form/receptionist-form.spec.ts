import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReceptionistForm } from './receptionist-form';

describe('ReceptionistForm', () => {
  let component: ReceptionistForm;
  let fixture: ComponentFixture<ReceptionistForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceptionistForm],
    }).compileComponents();

    fixture = TestBed.createComponent(ReceptionistForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
