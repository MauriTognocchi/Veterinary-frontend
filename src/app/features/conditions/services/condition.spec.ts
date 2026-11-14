import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ConditionService } from './condition';

describe('ConditionService', () => {
  let service: ConditionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(ConditionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
