import { TestBed } from '@angular/core/testing';
import { Breed } from './breed';

describe('Breed', () => {
  let service: Breed;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Breed);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
