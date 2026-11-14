import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { PetService } from './pet';

describe('PetService', () => {
  let service: PetService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(PetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
