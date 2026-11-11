import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReceptionistDetail } from './receptionist-detail';

describe('ReceptionistDetail', () => {
  let component: ReceptionistDetail;
  let fixture: ComponentFixture<ReceptionistDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceptionistDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(ReceptionistDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
