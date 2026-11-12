import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { BreedService } from './breed';

describe('BreedService', () => {
  let service: BreedService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(BreedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
