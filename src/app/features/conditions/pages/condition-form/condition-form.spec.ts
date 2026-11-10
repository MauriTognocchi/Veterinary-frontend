import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConditionForm } from './condition-form';

describe('ConditionForm', () => {
  let component: ConditionForm;
  let fixture: ComponentFixture<ConditionForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConditionForm],
    }).compileComponents();

    fixture = TestBed.createComponent(ConditionForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
