import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VisitDetail } from './visit-detail';

describe('VisitDetail', () => {
  let component: VisitDetail;
  let fixture: ComponentFixture<VisitDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(VisitDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
