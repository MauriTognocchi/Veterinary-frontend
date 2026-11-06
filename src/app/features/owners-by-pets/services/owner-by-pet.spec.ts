import { TestBed } from '@angular/core/testing';
import { OwnerByPet } from './owner-by-pet';

describe('OwnerByPet', () => {
  let service: OwnerByPet;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OwnerByPet);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
