import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReceptionistResponse } from '../models/receptionist.model';
import { ReceptionistService } from './receptionist';

describe('ReceptionistService', () => {
  let service: ReceptionistService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReceptionistService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('reactiva por PATCH sin cuerpo, codifica el ID y devuelve el perfil completo', () => {
    const updated: ReceptionistResponse = {
      externalId: 'rec/1', firstName: 'Ana', lastName: 'García',
      phone: '123', email: 'ana@example.com', active: true, branch: null,
    };
    let response: ReceptionistResponse | undefined;
    service.reactivate('rec/1').subscribe((value) => response = value);
    const request = http.expectOne('http://localhost:8080/api/receptionists/rec%2F1/reactivate');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toBeNull();
    request.flush(updated);
    expect(response).toEqual(updated);
  });
});
