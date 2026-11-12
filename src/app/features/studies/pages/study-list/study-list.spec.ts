import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudyList } from './study-list';

describe('StudyList', () => {
  let component: StudyList;
  let fixture: ComponentFixture<StudyList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudyList],
    }).compileComponents();

    fixture = TestBed.createComponent(StudyList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
