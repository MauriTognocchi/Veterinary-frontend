import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserService } from './user';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('reactiva la cuenta con PATCH sin body y acepta 204', () => {
    let completed = false;

    service.reactivate('user-1').subscribe({
      complete: () => {
        completed = true;
      },
    });

    const request = httpMock.expectOne(
      'http://localhost:8080/api/users/user-1/reactivate',
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toBeNull();

    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(completed).toBe(true);
  });

  it('codifica el externalId en la URL', () => {
    service.reactivate('user/1').subscribe();

    const request = httpMock.expectOne(
      'http://localhost:8080/api/users/user%2F1/reactivate',
    );
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
