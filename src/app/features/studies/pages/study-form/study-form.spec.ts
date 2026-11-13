import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StudyForm } from './study-form';

describe('StudyForm', () => {
  let component: StudyForm;
  let fixture: ComponentFixture<StudyForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudyForm],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(StudyForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
