import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MedicationService } from './medication';

describe('MedicationService', () => {
  let service: MedicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(MedicationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
