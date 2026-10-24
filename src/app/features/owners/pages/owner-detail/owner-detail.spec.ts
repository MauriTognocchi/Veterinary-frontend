import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OwnerDetail } from './owner-detail';

describe('OwnerDetail', () => {
  let component: OwnerDetail;
  let fixture: ComponentFixture<OwnerDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(OwnerDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
