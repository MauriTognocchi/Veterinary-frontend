import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BranchRequest, BranchResponse } from '../models/branch.model';
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
  const request: BranchRequest = {
    name: 'Sucursal Centro',
    phone: '11 5555-1234',
    email: 'centro@veterinaria.com',
    openingTime: '08:00',
    closingTime: '18:00',
    address: {
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

    const httpRequest = http.expectOne(baseUrl);
    expect(httpRequest.request.method).toBe('GET');

    httpRequest.flush([branch]);

    expect(response).toEqual([branch]);
  });

  it('obtiene una sucursal por externalId', () => {
    let response: BranchResponse | undefined;

    service.getById('branch-1').subscribe((value) => {
      response = value;
    });

    const httpRequest = http.expectOne(`${baseUrl}/branch-1`);
    expect(httpRequest.request.method).toBe('GET');

    httpRequest.flush(branch);

    expect(response).toEqual(branch);
  });

  it('crea una sucursal', () => {
    service.create(request).subscribe();

    const httpRequest = http.expectOne(baseUrl);
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);

    httpRequest.flush(branch);
  });

  it('actualiza una sucursal', () => {
    service.update('branch-1', request).subscribe();

    const httpRequest = http.expectOne(`${baseUrl}/branch-1`);
    expect(httpRequest.request.method).toBe('PUT');
    expect(httpRequest.request.body).toEqual(request);

    httpRequest.flush(branch);
  });

  it('elimina una sucursal', () => {
    service.delete('branch-1').subscribe();

    const httpRequest = http.expectOne(`${baseUrl}/branch-1`);
    expect(httpRequest.request.method).toBe('DELETE');

    httpRequest.flush(null);
  });
});
