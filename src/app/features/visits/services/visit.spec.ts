import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { VisitService } from './visit';

describe('VisitService', () => {
  let service: VisitService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(VisitService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
