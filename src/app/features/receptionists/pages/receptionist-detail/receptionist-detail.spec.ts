import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReceptionistDetail } from './receptionist-detail';

describe('ReceptionistDetail', () => {
  let component: ReceptionistDetail;
  let fixture: ComponentFixture<ReceptionistDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceptionistDetail],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReceptionistDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
