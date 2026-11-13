import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  OwnerResponse,
  OwnerWithCredentialsRequest,
} from '../models/owner.model';
import { OwnerService } from './owner';

describe('OwnerService', () => {
  let service: OwnerService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OwnerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('crea un propietario con credenciales en el endpoint correcto', () => {
    const request: OwnerWithCredentialsRequest = {
      firstName: 'Ana',
      lastName: 'Gómez',
      phone: '11 5555-1234',
      email: 'ana@example.com',
      dni: '30123456',
      address: {
        street: 'Av. Siempre Viva',
        number: '742',
        city: 'Springfield',
        province: 'Buenos Aires',
        country: 'Argentina',
      },
      password: 'secreto',
    };

    const response: OwnerResponse = {
      externalId: 'owner-1',
      firstName: 'Ana',
      lastName: 'Gómez',
      phone: '11 5555-1234',
      email: 'ana@example.com',
      dni: '30123456',
      address: null,
    };

    let created: OwnerResponse | undefined;
    service.createWithCredentials(request).subscribe((owner) => {
      created = owner;
    });

    const httpRequest = httpMock.expectOne(
      'http://localhost:8080/api/owners/with-credentials',
    );
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);

    httpRequest.flush(response, { status: 201, statusText: 'Created' });

    expect(created).toEqual(response);
  });
});
