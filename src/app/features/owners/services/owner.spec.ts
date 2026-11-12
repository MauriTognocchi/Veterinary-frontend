import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { OwnerService } from './owner';

describe('OwnerService', () => {
  let service: OwnerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(OwnerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
