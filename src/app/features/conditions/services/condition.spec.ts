import { TestBed } from '@angular/core/testing';
import { Condition } from './condition';

describe('Condition', () => {
  let service: Condition;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Condition);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
