import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth';
import { TokenStorageService } from './token-storage.service';

function encodePart(value: Record<string, unknown>): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function createAccessToken(roles: string[]): string {
  return `${encodePart({ alg: 'HS256', typ: 'JWT' })}.${encodePart({ sub: 'test@example.com', roles, exp: Math.floor(Date.now() / 1000) + 3600 })}.signature`;
}

describe('AuthService', () => {
  let http: HttpTestingController;
  let storage: TokenStorageService;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    sessionStorage.clear();
    router = { navigate: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('recupera roles y permisos del access token guardado', () => {
    storage.setTokens(
      createAccessToken(['ROLE_ADMIN', 'VIEW_OWNERS', 'CREATE_OWNERS']),
      'refresh-token',
    );

    const service = TestBed.inject(AuthService);

    expect(service.roles()).toEqual(['ROLE_ADMIN']);
    expect(service.permissions()).toEqual(['VIEW_OWNERS', 'CREATE_OWNERS']);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('separa roles y permisos e ignora roles desconocidos', () => {
    storage.setTokens(
      createAccessToken(['ROLE_CLIENT', 'ROLE_UNKNOWN', 'VIEW_PETS']),
      'refresh-token',
    );

    const service = TestBed.inject(AuthService);

    expect(service.roles()).toEqual(['ROLE_CLIENT']);
    expect(service.permissions()).toEqual(['VIEW_PETS']);
    expect(service.hasRole('ROLE_CLIENT')).toBe(true);
    expect(service.hasPermission('VIEW_PETS')).toBe(true);
    expect(service.hasAnyRole(['ROLE_ADMIN', 'ROLE_CLIENT'])).toBe(true);
    expect(service.hasAnyPermission(['VIEW_OWNERS', 'VIEW_PETS'])).toBe(true);
  });

  it('deja roles y permisos vacíos si el token es inválido', () => {
    storage.setTokens('token-invalido', 'refresh-token');

    const service = TestBed.inject(AuthService);

    expect(service.roles()).toEqual([]);
    expect(service.permissions()).toEqual([]);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('no toma como sesión un refresh token aislado ni un access token expirado', () => {
    sessionStorage.setItem('refreshToken', 'refresh-token');
    const service = TestBed.inject(AuthService);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.roles()).toEqual([]);
  });

  it('no restaura un access token expirado ni sus roles', () => {
    storage.setTokens(`${encodePart({ alg: 'HS256' })}.${encodePart({ roles: ['ROLE_ADMIN'], exp: 1 })}.signature`, 'refresh');
    const service = TestBed.inject(AuthService);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.roles()).toEqual([]);
  });

  it('login rechazado sin sesión previa no guarda tokens ni roles', () => {
    const service = TestBed.inject(AuthService);
    let errorStatus: number | undefined;
    service.login({ username: 'vet', password: 'wrong' }).subscribe({ error: (err) => errorStatus = err.status });
    http.expectOne('http://localhost:8080/api/auth/login').flush(
      { message: 'Bad credentials' }, { status: 401, statusText: 'Unauthorized' },
    );
    expect(errorStatus).toBe(401);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.email()).toBeNull();
    expect(service.roles()).toEqual([]);
    expect(service.permissions()).toEqual([]);
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
  });

  it('login rechazado limpia tokens residuales antes de la respuesta y no reactiva la sesión', () => {
    storage.setTokens(createAccessToken(['ROLE_ADMIN', 'VIEW_USERS']), 'old-refresh');
    const service = TestBed.inject(AuthService);
    expect(service.isAuthenticated()).toBe(true);
    let status: number | undefined;
    service.login({ username: 'vet', password: 'wrong' }).subscribe({ error: (err) => status = err.status });
    expect(service.isAuthenticated()).toBe(false);
    expect(storage.getAccessToken()).toBeNull();
    http.expectOne('http://localhost:8080/api/auth/login').flush(
      { message: 'Bad credentials' }, { status: 401, statusText: 'Unauthorized' },
    );
    expect(status).toBe(401);
    expect(service.email()).toBeNull();
    expect(service.roles()).toEqual([]);
    expect(service.permissions()).toEqual([]);
    expect(storage.getRefreshToken()).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('un 200 sin ambos tokens válidos no crea sesión', () => {
    const service = TestBed.inject(AuthService);
    let error: unknown;
    service.login({ username: 'vet', password: 'password' }).subscribe({ error: (err) => error = err });
    http.expectOne('http://localhost:8080/api/auth/login').flush({ accessToken: 'invalid', refreshToken: 'refresh' });
    expect(error).toBeInstanceOf(Error);
    expect(service.isAuthenticated()).toBe(false);
    expect(storage.getAccessToken()).toBeNull();
  });

  it('actualiza roles y permisos al iniciar sesión', () => {
    const service = TestBed.inject(AuthService);
    const accessToken = createAccessToken([
      'ROLE_RECEPTIONIST',
      'VIEW_OWNERS',
      'CREATE_OWNERS',
    ]);

    service.login({ username: 'recepcion', password: 'secreto' }).subscribe();

    const request = http.expectOne('http://localhost:8080/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      username: 'recepcion',
      password: 'secreto',
    });

    request.flush({ accessToken, refreshToken: 'refresh-token' });

    expect(service.roles()).toEqual(['ROLE_RECEPTIONIST']);
    expect(service.permissions()).toEqual(['VIEW_OWNERS', 'CREATE_OWNERS']);
    expect(service.isAuthenticated()).toBe(true);
    expect(storage.getAccessToken()).toBe(accessToken);
    expect(storage.getRefreshToken()).toBe('refresh-token');
  });

  it('actualiza roles y permisos al renovar el token', () => {
    storage.setTokens(createAccessToken(['ROLE_CLIENT']), 'refresh-token');
    const service = TestBed.inject(AuthService);
    const renewedAccessToken = createAccessToken([
      'ROLE_VETERINARIAN',
      'VIEW_OWNERS',
    ]);

    service.refresh().subscribe();

    const request = http.expectOne('http://localhost:8080/api/auth/refresh');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ refreshToken: 'refresh-token' });

    request.flush({ accessToken: renewedAccessToken });

    expect(service.roles()).toEqual(['ROLE_VETERINARIAN']);
    expect(service.permissions()).toEqual(['VIEW_OWNERS']);
    expect(storage.getAccessToken()).toBe(renewedAccessToken);
    expect(storage.getRefreshToken()).toBe('refresh-token');
  });

  it('no renueva si el access token es decodificable', async () => {
    storage.setTokens(createAccessToken(['ROLE_ADMIN']), 'refresh-token');
    const service = TestBed.inject(AuthService);

    await expect(firstValueFrom(service.ensureSession())).resolves.toBe(true);

    http.expectNone('http://localhost:8080/api/auth/refresh');
  });

  it('renueva cuando el access token es inválido y hay refresh token', async () => {
    storage.setTokens('token-invalido', 'refresh-token');
    const service = TestBed.inject(AuthService);
    const renewedAccessToken = createAccessToken([
      'ROLE_ADMIN',
      'VIEW_OWNERS',
    ]);

    const resultPromise = firstValueFrom(service.ensureSession());

    const request = http.expectOne('http://localhost:8080/api/auth/refresh');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ refreshToken: 'refresh-token' });
    request.flush({
      accessToken: renewedAccessToken,
      refreshToken: 'nuevo-refresh-token',
    });

    await expect(resultPromise).resolves.toBe(true);
    expect(service.roles()).toEqual(['ROLE_ADMIN']);
    expect(service.permissions()).toEqual(['VIEW_OWNERS']);
    expect(service.isAuthenticated()).toBe(true);
    expect(storage.getAccessToken()).toBe(renewedAccessToken);
    expect(storage.getRefreshToken()).toBe('nuevo-refresh-token');
  });

  it('renueva cuando falta el access token pero hay refresh token', async () => {
    sessionStorage.setItem('refreshToken', 'refresh-token');
    const service = TestBed.inject(AuthService);
    const renewedAccessToken = createAccessToken(['ROLE_RECEPTIONIST']);

    const resultPromise = firstValueFrom(service.ensureSession());

    const request = http.expectOne('http://localhost:8080/api/auth/refresh');
    request.flush({ accessToken: renewedAccessToken });

    await expect(resultPromise).resolves.toBe(true);
    expect(service.roles()).toEqual(['ROLE_RECEPTIONIST']);
    expect(service.isAuthenticated()).toBe(true);
    expect(storage.getAccessToken()).toBe(renewedAccessToken);
  });

  it('limpia la sesión cuando el refresh falla', async () => {
    storage.setTokens('token-invalido', 'refresh-token');
    const service = TestBed.inject(AuthService);

    const resultPromise = firstValueFrom(service.ensureSession());

    const request = http.expectOne('http://localhost:8080/api/auth/refresh');
    request.flush(
      {},
      { status: 401, statusText: 'Unauthorized' },
    );

    await expect(resultPromise).resolves.toBe(false);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.roles()).toEqual([]);
    expect(service.permissions()).toEqual([]);
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('no intenta renovar cuando no hay tokens', async () => {
    const service = TestBed.inject(AuthService);

    await expect(firstValueFrom(service.ensureSession())).resolves.toBe(false);

    http.expectNone('http://localhost:8080/api/auth/refresh');
  });

  it('limpia roles y permisos al cerrar sesión', () => {
    storage.setTokens(
      createAccessToken(['ROLE_ADMIN', 'VIEW_OWNERS']),
      'refresh-token',
    );
    const service = TestBed.inject(AuthService);

    service.logout();

    expect(service.roles()).toEqual([]);
    expect(service.permissions()).toEqual([]);
    expect(service.isAuthenticated()).toBe(false);
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: {},
    });
  });

  it('no restaura la sesión si se cierra sesión con un refresh en curso', () => {
    storage.setTokens('token-invalido', 'refresh-token');
    const service = TestBed.inject(AuthService);

    service.refresh().subscribe();

    const request = http.expectOne('http://localhost:8080/api/auth/refresh');
    service.logout();

    request.flush({
      accessToken: createAccessToken(['ROLE_ADMIN']),
      refreshToken: 'refresh-token',
    });

    expect(service.isAuthenticated()).toBe(false);
    expect(service.roles()).toEqual([]);
    expect(service.permissions()).toEqual([]);
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: {},
    });
  });

  it('no sobrescribe la sesión nueva si un refresh anterior responde después del login', () => {
    storage.setTokens('token-invalido', 'refresh-token');
    const service = TestBed.inject(AuthService);

    service.refresh().subscribe();

    const refreshRequest = http.expectOne(
      'http://localhost:8080/api/auth/refresh',
    );
    const loginAccessToken = createAccessToken([
      'ROLE_ADMIN',
      'VIEW_OWNERS',
    ]);

    service.login({ username: 'admin', password: 'secreto' }).subscribe();

    const loginRequest = http.expectOne('http://localhost:8080/api/auth/login');
    loginRequest.flush({
      accessToken: loginAccessToken,
      refreshToken: 'login-refresh-token',
    });

    refreshRequest.flush({
      accessToken: createAccessToken(['ROLE_CLIENT']),
      refreshToken: 'viejo-refresh-token',
    });

    expect(storage.getAccessToken()).toBe(loginAccessToken);
    expect(storage.getRefreshToken()).toBe('login-refresh-token');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.roles()).toEqual(['ROLE_ADMIN']);
    expect(service.permissions()).toEqual(['VIEW_OWNERS']);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('acepta una cuenta activa autenticada sin autoridades de gestión sin inventar CLIENT', () => {
    const service = TestBed.inject(AuthService);
    const accessToken = createAccessToken([]);
    service.login({ username: 'vet-activo', password: 'secreto' }).subscribe();
    http.expectOne('http://localhost:8080/api/auth/login').flush({
      accessToken,
      refreshToken: 'refresh-token',
    });
    expect(service.isAuthenticated()).toBe(true);
    expect(service.email()).toBe('test@example.com');
    expect(service.roles()).toEqual([]);
    expect(service.permissions()).toEqual([]);
    expect(service.hasRole('ROLE_CLIENT')).toBe(false);
    expect(storage.getAccessToken()).toBe(accessToken);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('un refresh anterior fallido no borra un login nuevo', async () => {
    storage.setTokens('token-invalido', 'refresh-anterior');
    const service = TestBed.inject(AuthService);
    const previousSession = firstValueFrom(service.ensureSession());
    const refreshRequest = http.expectOne('http://localhost:8080/api/auth/refresh');

    const newToken = createAccessToken(['ROLE_ADMIN']);
    service.login({ username: 'admin', password: 'secreto' }).subscribe();
    http.expectOne('http://localhost:8080/api/auth/login').flush({
      accessToken: newToken,
      refreshToken: 'refresh-nuevo',
    });
    refreshRequest.flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(previousSession).resolves.toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.roles()).toEqual(['ROLE_ADMIN']);
    expect(storage.getAccessToken()).toBe(newToken);
    expect(storage.getRefreshToken()).toBe('refresh-nuevo');
  });
});
