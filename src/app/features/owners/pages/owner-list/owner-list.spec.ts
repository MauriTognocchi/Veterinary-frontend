import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OwnerList } from './owner-list';

describe('OwnerList', () => {
  let component: OwnerList;
  let fixture: ComponentFixture<OwnerList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerList],
    }).compileComponents();

    fixture = TestBed.createComponent(OwnerList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
