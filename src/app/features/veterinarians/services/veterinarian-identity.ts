import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, tap } from 'rxjs';
import { AuthService } from '../../../core/services/auth';
import { VeterinarianService } from './veterinarian';

@Injectable({ providedIn: 'root' })
export class VeterinarianIdentityService {
  private readonly auth = inject(AuthService);
  private readonly veterinarians = inject(VeterinarianService);
  private readonly resolved = signal<{ version: number; externalId: string } | null>(null);
  private readonly failed = signal<{ version: number; status: number } | null>(null);
  private request: { version: number; result: Observable<void> } | null = null;

  readonly externalId = computed(() => {
    const current = this.resolved();
    return this.auth.hasRole('ROLE_VETERINARIAN') &&
      current?.version === this.auth.sessionVersion() ? current.externalId : null;
  });

  readonly errorStatus = computed(() => {
    const current = this.failed();
    return this.auth.hasRole('ROLE_VETERINARIAN') &&
      current?.version === this.auth.sessionVersion() ? current.status : null;
  });

  constructor() {
    effect(() => {
      const version = this.auth.sessionVersion();
      if (this.request && this.request.version !== version) this.request = null;
      if (this.resolved()?.version !== version) this.resolved.set(null);
      if (this.failed()?.version !== version) this.failed.set(null);
    });
  }

  load(): Observable<void> {
    if (!this.auth.hasRole('ROLE_VETERINARIAN')) return of(undefined);

    const version = this.auth.sessionVersion();
    if (this.request?.version === version) return this.request.result;

    const result = this.veterinarians.getMine().pipe(
      tap(({ externalId }) => {
        if (this.auth.sessionVersion() !== version || !this.auth.hasRole('ROLE_VETERINARIAN')) return;
        if (typeof externalId === 'string' && externalId.trim()) {
          this.resolved.set({ version, externalId });
          this.failed.set(null);
        } else {
          this.failed.set({ version, status: 0 });
        }
      }),
      map(() => undefined),
      catchError((error: { status?: number }) => {
        if (this.auth.sessionVersion() === version && this.auth.hasRole('ROLE_VETERINARIAN')) {
          this.failed.set({ version, status: error?.status ?? 0 });
        }
        return of(undefined);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.request = { version, result };
    return result;
  }
}
