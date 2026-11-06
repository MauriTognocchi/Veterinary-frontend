import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  AnimalTypeRequest,
  AnimalTypeResponse,
} from '../models/animal-type.model';
import { AnimalTypeService } from './animal-type';

describe('AnimalTypeService', () => {
  let http: HttpTestingController;
  let service: AnimalTypeService;

  const baseUrl = 'http://localhost:8080/api/animal-types';
  const animalType: AnimalTypeResponse = {
    externalId: 'animal-type-1',
    name: 'Perro',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AnimalTypeService);
  });

  afterEach(() => {
    http.verify();
  });

  it('obtiene todos los tipos de animales', () => {
    let response: AnimalTypeResponse[] | undefined;

    service.getAll().subscribe((value) => {
      response = value;
    });

    const request = http.expectOne(baseUrl);
    expect(request.request.method).toBe('GET');

    request.flush([animalType]);

    expect(response).toEqual([animalType]);
  });

  it('obtiene un tipo de animal por externalId', () => {
    let response: AnimalTypeResponse | undefined;
    const externalId = 'animal/type 1';

    service.getById(externalId).subscribe((value) => {
      response = value;
    });

    const request = http.expectOne(`${baseUrl}/animal%2Ftype%201`);
    expect(request.request.method).toBe('GET');

    request.flush(animalType);

    expect(response).toEqual(animalType);
  });

  it('crea un tipo de animal', () => {
    const payload: AnimalTypeRequest = { name: 'Perro' };
    let response: AnimalTypeResponse | undefined;

    service.create(payload).subscribe((value) => {
      response = value;
    });

    const request = http.expectOne(baseUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);

    request.flush(animalType);

    expect(response).toEqual(animalType);
  });

  it('actualiza un tipo de animal', () => {
    const payload: AnimalTypeRequest = { name: 'Gato' };
    let response: AnimalTypeResponse | undefined;

    service.update('animal-type-1', payload).subscribe((value) => {
      response = value;
    });

    const request = http.expectOne(`${baseUrl}/animal-type-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);

    request.flush({ ...animalType, name: 'Gato' });

    expect(response?.name).toBe('Gato');
  });

  it('elimina un tipo de animal', () => {
    let completed = false;

    service.delete('animal-type-1').subscribe({
      complete: () => {
        completed = true;
      },
    });

    const request = http.expectOne(`${baseUrl}/animal-type-1`);
    expect(request.request.method).toBe('DELETE');

    request.flush(null);

    expect(completed).toBe(true);
  });
});
