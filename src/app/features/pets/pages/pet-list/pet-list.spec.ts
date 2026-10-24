import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PetList } from './pet-list';

describe('PetList', () => {
  let component: PetList;
  let fixture: ComponentFixture<PetList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PetList],
    }).compileComponents();

    fixture = TestBed.createComponent(PetList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
