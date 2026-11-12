import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { OwnerByPetService } from './owner-by-pet';

describe('OwnerByPetService', () => {
  let service: OwnerByPetService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(OwnerByPetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
