import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BreedList } from './breed-list';

describe('BreedList', () => {
  let component: BreedList;
  let fixture: ComponentFixture<BreedList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreedList],
    }).compileComponents();

    fixture = TestBed.createComponent(BreedList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
