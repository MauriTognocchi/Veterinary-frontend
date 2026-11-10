import { TestBed } from '@angular/core/testing';
import { Medication } from './medication';

describe('Medication', () => {
  let service: Medication;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Medication);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
