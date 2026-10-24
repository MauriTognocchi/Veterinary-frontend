import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OwnerForm } from './owner-form';

describe('OwnerForm', () => {
  let component: OwnerForm;
  let fixture: ComponentFixture<OwnerForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerForm],
    }).compileComponents();

    fixture = TestBed.createComponent(OwnerForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
