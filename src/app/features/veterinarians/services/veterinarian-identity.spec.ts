import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth';
import { VeterinarianService } from './veterinarian';
import { VeterinarianIdentityService } from './veterinarian-identity';

describe('VeterinarianIdentityService', () => {
  let version: ReturnType<typeof signal<number>>;
  let auth: { sessionVersion: ReturnType<typeof signal<number>>; hasRole: ReturnType<typeof vi.fn> };
  let veterinarians: { getMine: ReturnType<typeof vi.fn> };
  let identity: VeterinarianIdentityService;

  beforeEach(() => {
    version = signal(1);
    auth = { sessionVersion: version, hasRole: vi.fn().mockReturnValue(true) };
    veterinarians = { getMine: vi.fn() };
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: auth },
      { provide: VeterinarianService, useValue: veterinarians },
    ] });
    identity = TestBed.inject(VeterinarianIdentityService);
  });

  it('consulta /me una sola vez por sesión y reutiliza el ID', () => {
    const response = new Subject<{ externalId: string }>();
    veterinarians.getMine.mockReturnValue(response.asObservable());
    identity.load().subscribe();
    identity.load().subscribe();
    expect(veterinarians.getMine).toHaveBeenCalledTimes(1);
    expect(identity.externalId()).toBeNull();
    response.next({ externalId: 'vet-1' });
    response.complete();
    expect(identity.externalId()).toBe('vet-1');
    identity.load().subscribe();
    expect(veterinarians.getMine).toHaveBeenCalledTimes(1);
  });

  it('al cambiar de sesión invalida inmediatamente el ID y una respuesta antigua no lo restaura', () => {
    const oldResponse = new Subject<{ externalId: string }>();
    veterinarians.getMine.mockReturnValueOnce(oldResponse.asObservable()).mockReturnValueOnce(of({ externalId: 'vet-2' }));
    identity.load().subscribe();
    version.set(2);
    expect(identity.externalId()).toBeNull();
    identity.load().subscribe();
    expect(identity.externalId()).toBe('vet-2');
    oldResponse.next({ externalId: 'vet-1' });
    oldResponse.complete();
    expect(identity.externalId()).toBe('vet-2');
    expect(veterinarians.getMine).toHaveBeenCalledTimes(2);
    auth.hasRole.mockReturnValue(false);
    version.set(3);
    expect(identity.externalId()).toBeNull();
  });

  it('borra el ID resuelto al cerrar sesión y no permite reusarlo tras otro login', () => {
    veterinarians.getMine.mockReturnValue(of({ externalId: 'vet-1' }));
    identity.load().subscribe();
    expect(identity.externalId()).toBe('vet-1');
    auth.hasRole.mockReturnValue(false);
    version.set(2);
    expect(identity.externalId()).toBeNull();
    auth.hasRole.mockReturnValue(true);
    version.set(3);
    expect(identity.externalId()).toBeNull();
    veterinarians.getMine.mockReturnValue(of({ externalId: 'vet-2' }));
    identity.load().subscribe();
    expect(identity.externalId()).toBe('vet-2');
    expect(veterinarians.getMine).toHaveBeenCalledTimes(2);
  });

  it.each([403, 404])('retiene error %i sin ID y sin reintentar en la misma sesión', (status) => {
    veterinarians.getMine.mockReturnValue(throwError(() => ({ status })));
    identity.load().subscribe();
    expect(identity.externalId()).toBeNull();
    expect(identity.errorStatus()).toBe(status);
    identity.load().subscribe();
    expect(veterinarians.getMine).toHaveBeenCalledTimes(1);
  });

  it('no consulta /me con otro rol ni acepta respuestas sin externalId', () => {
    auth.hasRole.mockReturnValue(false);
    identity.load().subscribe();
    expect(veterinarians.getMine).not.toHaveBeenCalled();
    auth.hasRole.mockReturnValue(true);
    veterinarians.getMine.mockReturnValue(of({ externalId: '' }));
    identity.load().subscribe();
    expect(identity.externalId()).toBeNull();
    expect(identity.errorStatus()).toBe(0);
  });
});
