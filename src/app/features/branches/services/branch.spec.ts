import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BranchResponse } from '../models/branch.model';
import { BranchService } from './branch';

describe('BranchService', () => {
  let http: HttpTestingController;
  let service: BranchService;

  const baseUrl = 'http://localhost:8080/api/branches';
  const branch: BranchResponse = {
    externalId: 'branch-1',
    name: 'Sucursal Centro',
    phone: '11 5555-1234',
    email: 'centro@veterinaria.com',
    openingTime: '08:00:00',
    closingTime: '18:00:00',
    address: {
      id: 1,
      street: 'Av. Siempre Viva',
      number: '742',
      city: 'Springfield',
      province: 'Buenos Aires',
      country: 'Argentina',
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(BranchService);
  });

  afterEach(() => {
    http.verify();
  });

  it('obtiene todas las sucursales', () => {
    let response: BranchResponse[] | undefined;

    service.getAll().subscribe((value) => {
      response = value;
    });

    const request = http.expectOne(baseUrl);
    expect(request.request.method).toBe('GET');

    request.flush([branch]);

    expect(response).toEqual([branch]);
  });
});
