import { TestBed } from '@angular/core/testing';
import { Receptionist } from './receptionist';

describe('Receptionist', () => {
  let service: Receptionist;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Receptionist);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
