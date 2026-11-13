import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  VeterinarianResponse,
  VeterinarianUpdateRequest,
} from '../models/veterinarian.model';
import { VeterinarianService } from './veterinarian';

describe('VeterinarianService', () => {
  let http: HttpTestingController;
  let service: VeterinarianService;

  const baseUrl = 'http://localhost:8080/api/veterinarians';
  const veterinarian: VeterinarianResponse = {
    externalId: 'vet-1',
    firstName: 'Juan',
    lastName: 'Pérez',
    licenseNumber: 'MN-1234',
    phone: '11 5555-6789',
    email: 'jperez@veterinaria.com',
    workStartTime: '08:00:00',
    workEndTime: '16:00:00',
    workDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
    active: true,
    branch: {
      externalId: 'branch-1',
      name: 'Sucursal Centro',
      phone: '11 5555-1234',
      email: 'centro@veterinaria.com',
      openingTime: '08:00:00',
      closingTime: '18:00:00',
      address: null,
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(VeterinarianService);
  });

  afterEach(() => {
    http.verify();
  });

  it('obtiene todos los veterinarios sin filtros', () => {
    let response: VeterinarianResponse[] | undefined;

    service.getAll().subscribe((value) => {
      response = value;
    });

    const httpRequest = http.expectOne(baseUrl);
    expect(httpRequest.request.method).toBe('GET');
    expect(httpRequest.request.params.keys()).toEqual([]);

    httpRequest.flush([veterinarian]);

    expect(response).toEqual([veterinarian]);
  });

  it('envía los filtros como query params', () => {
    service
      .getAll({
        firstName: 'Juan',
        lastName: 'Pérez',
        licenseNumber: 'MN-1234',
        branchExternalId: 'branch-1',
      })
      .subscribe();

    const httpRequest = http.expectOne(
      (req) => req.method === 'GET' && req.url === baseUrl,
    );
    expect(httpRequest.request.params.get('firstName')).toBe('Juan');
    expect(httpRequest.request.params.get('lastName')).toBe('Pérez');
    expect(httpRequest.request.params.get('licenseNumber')).toBe('MN-1234');
    expect(httpRequest.request.params.get('branchExternalId')).toBe('branch-1');

    httpRequest.flush([veterinarian]);
  });

  it('no envía filtros vacíos y recorta los valores', () => {
    service
      .getAll({
        firstName: '   ',
        lastName: 'Pérez  ',
        licenseNumber: '',
        branchExternalId: undefined,
      })
      .subscribe();

    const httpRequest = http.expectOne(
      (req) => req.method === 'GET' && req.url === baseUrl,
    );
    expect(httpRequest.request.params.keys()).toEqual(['lastName']);
    expect(httpRequest.request.params.get('lastName')).toBe('Pérez');

    httpRequest.flush([]);
  });

  it('obtiene un veterinario por externalId', () => {
    let response: VeterinarianResponse | undefined;

    service.getById('vet-1').subscribe((value) => {
      response = value;
    });

    const httpRequest = http.expectOne(`${baseUrl}/vet-1`);
    expect(httpRequest.request.method).toBe('GET');

    httpRequest.flush(veterinarian);

    expect(response).toEqual(veterinarian);
  });

  it('actualiza un veterinario con PUT', () => {
    const updateRequest: VeterinarianUpdateRequest = {
      firstName: 'Juan',
      lastName: 'Pérez',
      licenseNumber: 'MN-1234',
      phone: '11 5555-6789',
      email: 'jperez@veterinaria.com',
      workStartTime: '09:00',
      workEndTime: '17:00',
      workDays: ['MONDAY', 'WEDNESDAY'],
      branchExternalId: 'branch-1',
    };
    let response: VeterinarianResponse | undefined;

    service.update('vet-1', updateRequest).subscribe((value) => {
      response = value;
    });

    const httpRequest = http.expectOne(`${baseUrl}/vet-1`);
    expect(httpRequest.request.method).toBe('PUT');
    expect(httpRequest.request.body).toEqual(updateRequest);

    httpRequest.flush(veterinarian);

    expect(response).toEqual(veterinarian);
  });

  it('elimina un veterinario con DELETE', () => {
    let completed = false;

    service.delete('vet-1').subscribe({
      complete: () => {
        completed = true;
      },
    });

    const httpRequest = http.expectOne(`${baseUrl}/vet-1`);
    expect(httpRequest.request.method).toBe('DELETE');

    httpRequest.flush(null, { status: 204, statusText: 'No Content' });

    expect(completed).toBe(true);
  });

  it('propaga el error al eliminar un veterinario inactivo', () => {
    let status: number | undefined;

    service.delete('vet-1').subscribe({
      error: (err) => {
        status = err.status;
      },
    });

    const httpRequest = http.expectOne(`${baseUrl}/vet-1`);
    httpRequest.flush({}, { status: 409, statusText: 'Conflict' });

    expect(status).toBe(409);
  });

  it('reactiva por PATCH sin cuerpo, codifica el ID y devuelve el perfil completo', () => {
    const updated = { ...veterinarian, active: true, firstName: 'Nuevo' };
    let response: VeterinarianResponse | undefined;
    service.reactivate('vet/1').subscribe((value) => response = value);
    const request = http.expectOne(`${baseUrl}/vet%2F1/reactivate`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toBeNull();
    request.flush(updated);
    expect(response).toEqual(updated);
  });
});
