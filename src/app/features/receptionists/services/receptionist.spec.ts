import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ReceptionistService } from './receptionist';

describe('ReceptionistService', () => {
  let service: ReceptionistService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(ReceptionistService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
