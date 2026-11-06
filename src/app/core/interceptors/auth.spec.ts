import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { TokenStorageService } from '../services/token-storage.service';
import { authInterceptor } from './auth';

const REFRESH_URL = 'http://localhost:8080/api/auth/refresh';
const OLD_ACCESS_TOKEN = 'old-access-token';
const NEW_ACCESS_TOKEN = 'new-access-token';
const REFRESH_TOKEN = 'refresh-token';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let httpClient: HttpClient;
  let storage: TokenStorageService;
  let router: { navigate: ReturnType<typeof vi.fn> };

  function startSession(): AuthService {
    storage.setTokens(OLD_ACCESS_TOKEN, REFRESH_TOKEN);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => {
    sessionStorage.clear();
    router = { navigate: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    storage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('renueva el token y reintenta con el nuevo Authorization ante un 401', () => {
    startSession();
    let result: unknown;

    httpClient.get('/api/owners').subscribe({
      next: (value) => (result = value),
    });

    const initial = http.expectOne('/api/owners');
    expect(initial.request.headers.get('Authorization')).toBe(
      `Bearer ${OLD_ACCESS_TOKEN}`,
    );
    initial.flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = http.expectOne(REFRESH_URL);
    expect(refresh.request.method).toBe('POST');
    expect(refresh.request.body).toEqual({ refreshToken: REFRESH_TOKEN });
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush({
      accessToken: NEW_ACCESS_TOKEN,
      refreshToken: 'new-refresh-token',
    });

    const retry = http.expectOne('/api/owners');
    expect(retry.request.headers.get('Authorization')).toBe(
      `Bearer ${NEW_ACCESS_TOKEN}`,
    );
    retry.flush({ ok: true });

    expect(result).toEqual({ ok: true });
    expect(storage.getAccessToken()).toBe(NEW_ACCESS_TOKEN);
  });

  it('comparte una única petición de refresh entre dos 401 concurrentes', () => {
    startSession();

    httpClient.get('/api/owners').subscribe();
    httpClient.get('/api/pets').subscribe();

    http
      .expectOne('/api/owners')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    http
      .expectOne('/api/pets')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    const refreshes = http.match(REFRESH_URL);
    expect(refreshes.length).toBe(1);
    refreshes[0].flush({ accessToken: NEW_ACCESS_TOKEN });

    const ownersRetry = http.expectOne('/api/owners');
    const petsRetry = http.expectOne('/api/pets');

    expect(ownersRetry.request.headers.get('Authorization')).toBe(
      `Bearer ${NEW_ACCESS_TOKEN}`,
    );
    expect(petsRetry.request.headers.get('Authorization')).toBe(
      `Bearer ${NEW_ACCESS_TOKEN}`,
    );

    ownersRetry.flush({});
    petsRetry.flush({});
  });

  it.each([401, 403])(
    'limpia la sesión y ejecuta logout cuando el refresh responde %i',
    (status) => {
      const service = startSession();
      let error: unknown;

      httpClient.get('/api/owners').subscribe({
        error: (value) => (error = value),
      });

      http
        .expectOne('/api/owners')
        .flush({}, { status: 401, statusText: 'Unauthorized' });
      http
        .expectOne(REFRESH_URL)
        .flush({}, { status, statusText: 'Error' });

      expect(storage.getAccessToken()).toBeNull();
      expect(storage.getRefreshToken()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { reason: 'expired' },
      });
      expect((error as HttpErrorResponse).status).toBe(status);
    },
  );

  it.each([500, 0])(
    'conserva la sesión cuando el refresh falla con estado %i',
    (status) => {
      const service = startSession();
      let error: unknown;

      httpClient.get('/api/owners').subscribe({
        error: (value) => (error = value),
      });

      http
        .expectOne('/api/owners')
        .flush({}, { status: 401, statusText: 'Unauthorized' });

      const refresh = http.expectOne(REFRESH_URL);

      if (status === 0) {
        refresh.error(new ProgressEvent('error'));
      } else {
        refresh.flush({}, { status, statusText: 'Server Error' });
      }

      expect(storage.getAccessToken()).toBe(OLD_ACCESS_TOKEN);
      expect(storage.getRefreshToken()).toBe(REFRESH_TOKEN);
      expect(service.isAuthenticated()).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
      expect((error as HttpErrorResponse).status).toBe(status);
    },
  );

  it.each([403, 500, 0])(
    'no renueva ante un error %i en la petición original',
    (status) => {
      startSession();
      let error: unknown;

      httpClient.get('/api/owners').subscribe({
        error: (value) => (error = value),
      });

      const request = http.expectOne('/api/owners');

      if (status === 0) {
        request.error(new ProgressEvent('error'));
      } else {
        request.flush({}, { status, statusText: 'Error' });
      }

      http.expectNone(REFRESH_URL);
      expect(storage.getAccessToken()).toBe(OLD_ACCESS_TOKEN);
      expect(router.navigate).not.toHaveBeenCalled();
      expect((error as HttpErrorResponse).status).toBe(status);
    },
  );

  it('no agrega Authorization ni renueva en rutas /api/auth/', () => {
    startSession();
    let error: unknown;

    httpClient
      .post('/api/auth/login', { username: 'admin', password: 'secreto' })
      .subscribe({ error: (value) => (error = value) });

    const request = http.expectOne('/api/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    http.expectNone(REFRESH_URL);
    expect(storage.getAccessToken()).toBe(OLD_ACCESS_TOKEN);
    expect(storage.getRefreshToken()).toBe(REFRESH_TOKEN);
    expect(router.navigate).not.toHaveBeenCalled();
    expect((error as HttpErrorResponse).status).toBe(401);
  });

  it('no agrega Authorization cuando no hay access token', () => {
    let result: unknown;

    httpClient.get('/api/owners').subscribe({
      next: (value) => (result = value),
    });

    const request = http.expectOne('/api/owners');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ ok: true });

    expect(result).toEqual({ ok: true });
  });

  it('no genera otro refresh y ejecuta logout cuando el reintento vuelve a responder 401', () => {
    const service = startSession();
    let error: unknown;

    httpClient.get('/api/owners').subscribe({
      error: (value) => (error = value),
    });

    http
      .expectOne('/api/owners')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(REFRESH_URL).flush({ accessToken: NEW_ACCESS_TOKEN });

    const retry = http.expectOne('/api/owners');
    expect(retry.request.headers.get('Authorization')).toBe(
      `Bearer ${NEW_ACCESS_TOKEN}`,
    );
    retry.flush({}, { status: 401, statusText: 'Unauthorized' });

    http.expectNone(REFRESH_URL);
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'expired' },
    });
    expect((error as HttpErrorResponse).status).toBe(401);
  });
});
