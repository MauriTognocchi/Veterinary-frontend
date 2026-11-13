import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppointmentResponse } from '../models/appointment.model';
import { AppointmentService } from './appointment';

describe('AppointmentService', () => {
  let http: HttpTestingController;
  let service: AppointmentService;

  const baseUrl = 'http://localhost:8080/api/appointments';
  const appointment: AppointmentResponse = {
    externalId: 'appointment-1',
    appointmentDate: '2026-11-11T14:30:00',
    durationMinutes: 30,
    reason: 'Consulta general',
    status: 'PENDING',
    pet: {
      externalId: 'pet-1',
      name: 'Firulais',
      birthDate: '2020-05-05',
      active: true,
      color: 'Marrón',
      animalType: { externalId: 'animal-type-1', name: 'Perro' },
      breed: {
        externalId: 'breed-1',
        name: 'Labrador',
        animalType: { externalId: 'animal-type-1', name: 'Perro' },
      },
      visitsCount: 2,
      lastVisitDate: '2026-01-15',
      activeAppointments: 1,
    },
    veterinarian: {
      externalId: 'vet-1',
      firstName: 'Juan',
      lastName: 'Pérez',
      licenseNumber: 'MN-1234',
      phone: '11 5555-6789',
      email: 'jperez@veterinaria.com',
      workStartTime: '08:00:00',
      workEndTime: '16:00:00',
      workDays: ['MONDAY', 'WEDNESDAY'],
      active: true,
      branch: null,
    },
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
    service = TestBed.inject(AppointmentService);
  });

  afterEach(() => {
    http.verify();
  });

  it('obtiene todos los turnos sin filtros', () => {
    let response: AppointmentResponse[] | undefined;

    service.getAll().subscribe((value) => {
      response = value;
    });

    const httpRequest = http.expectOne(baseUrl);
    expect(httpRequest.request.method).toBe('GET');
    expect(httpRequest.request.params.keys()).toEqual([]);

    httpRequest.flush([appointment]);

    expect(response).toEqual([appointment]);
  });

  it('combina todos los filtros como query params', () => {
    service
      .getAll({
        dateFrom: '2026-11-01',
        dateTo: '2026-11-30',
        reason: 'Consulta',
        status: 'PENDING',
        petExternalId: 'pet-1',
        veterinarianExternalId: 'vet-1',
      })
      .subscribe();

    const httpRequest = http.expectOne(
      (req) => req.method === 'GET' && req.url === baseUrl,
    );
    expect(httpRequest.request.params.keys()).toEqual([
      'dateFrom',
      'dateTo',
      'reason',
      'status',
      'petExternalId',
      'veterinarianExternalId',
    ]);
    expect(httpRequest.request.params.get('dateFrom')).toBe('2026-11-01');
    expect(httpRequest.request.params.get('dateTo')).toBe('2026-11-30');
    expect(httpRequest.request.params.get('reason')).toBe('Consulta');
    expect(httpRequest.request.params.get('status')).toBe('PENDING');
    expect(httpRequest.request.params.get('petExternalId')).toBe('pet-1');
    expect(httpRequest.request.params.get('veterinarianExternalId')).toBe(
      'vet-1',
    );

    httpRequest.flush([appointment]);
  });

  it('no envía filtros vacíos o indefinidos y recorta los valores', () => {
    service
      .getAll({
        dateFrom: '   ',
        dateTo: '',
        reason: '  Consulta general  ',
        status: '',
        petExternalId: undefined,
        veterinarianExternalId: '  ',
      })
      .subscribe();

    const httpRequest = http.expectOne(
      (req) => req.method === 'GET' && req.url === baseUrl,
    );
    expect(httpRequest.request.params.keys()).toEqual(['reason']);
    expect(httpRequest.request.params.get('reason')).toBe('Consulta general');

    httpRequest.flush([]);
  });

  it('envía date cuando no hay rango de fechas', () => {
    service
      .getAll({ date: '2026-11-11T14:30:00' })
      .subscribe();

    const httpRequest = http.expectOne(
      (req) => req.method === 'GET' && req.url === baseUrl,
    );
    expect(httpRequest.request.params.keys()).toEqual(['date']);
    expect(httpRequest.request.params.get('date')).toBe('2026-11-11T14:30:00');

    httpRequest.flush([appointment]);
  });

  it('no combina date con el rango de fechas', () => {
    service
      .getAll({
        dateFrom: '2026-11-01',
        date: '2026-11-11T14:30:00',
      })
      .subscribe();

    const httpRequest = http.expectOne(
      (req) => req.method === 'GET' && req.url === baseUrl,
    );
    expect(httpRequest.request.params.keys()).toEqual(['dateFrom']);
    expect(httpRequest.request.params.get('date')).toBeNull();

    httpRequest.flush([appointment]);
  });

  it('no envía date cuando hay dateTo', () => {
    service
      .getAll({
        dateTo: '2026-11-30',
        date: '2026-11-11T14:30:00',
      })
      .subscribe();

    const httpRequest = http.expectOne(
      (req) => req.method === 'GET' && req.url === baseUrl,
    );
    expect(httpRequest.request.params.keys()).toEqual(['dateTo']);
    expect(httpRequest.request.params.get('date')).toBeNull();

    httpRequest.flush([appointment]);
  });

  it('propaga los errores del backend', () => {
    let status: number | undefined;

    service.getAll().subscribe({
      error: (err) => {
        status = err.status;
      },
    });

    const httpRequest = http.expectOne(baseUrl);
    httpRequest.flush({}, { status: 500, statusText: 'Internal Server Error' });

    expect(status).toBe(500);
  });

  it('confirma un turno con PATCH al endpoint /confirm', () => {
    service.confirmAppointment('appointment-1').subscribe();

    const httpRequest = http.expectOne(
      `${baseUrl}/appointment-1/confirm`,
    );
    expect(httpRequest.request.method).toBe('PATCH');
    expect(httpRequest.request.body).toBeNull();

    httpRequest.flush(null);
  });
});
