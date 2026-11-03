import {
  DestroyRef,
  Injectable,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { AuthService } from './auth';

export type SessionPhase = 'idle' | 'active' | 'warning';

const INACTIVITY_MS =15* 60_000;
const WARNING_MS = 60_000;
const ACTIVITY_THROTTLE_MS = 1_000;

@Injectable({ providedIn: 'root' })
export class SessionTimeoutService {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _phase = signal<SessionPhase>('idle');
  readonly phase = this._phase.asReadonly();

  private readonly _secondsLeft = signal(0);
  readonly secondsLeft = this._secondsLeft.asReadonly();

  private readonly _continuing = signal(false);
  readonly continuing = this._continuing.asReadonly();

  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setInterval> | null = null;

  private lastActivityAt = 0;
  private lastScheduleAt = 0;
  private warningEndsAt = 0;
  private warningRemainingMs = 0;

  private listenersController: AbortController | null = null;

  constructor() {
    effect(() => {
      const isAuthenticated = this.auth.isAuthenticated();

      untracked(() => {
        if (isAuthenticated) {
          this.start();
        } else {
          this.stop();
        }
      });
    });

    fromEvent(document, 'visibilitychange')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onVisibilityChange());

    this.destroyRef.onDestroy(() => this.stop());
  }

  start(): void {
    if (!this.auth.isAuthenticated() || this._phase() !== 'idle') {
      return;
    }

    this._phase.set('active');
    this._continuing.set(false);
    this.lastActivityAt = Date.now();
    this.lastScheduleAt = Date.now();

    this.attachActivityListeners();
    this.scheduleInactivityCheck();
  }

  stop(): void {
    this.clearTimers();
    this.detachActivityListeners();

    this._phase.set('idle');
    this._secondsLeft.set(0);
    this._continuing.set(false);
    this.warningRemainingMs = 0;
  }

  continueSession(): void {
    if (this._phase() !== 'warning' || this._continuing()) {
      return;
    }

    this._continuing.set(true);

    this.clearWarningTimer();

    this.auth.refresh().subscribe({
      next: () => {
        this._continuing.set(false);

        if (!this.auth.isAuthenticated()) {
          this.stop();
          return;
        }

        this._phase.set('active');
        this.lastActivityAt = Date.now();
        this.lastScheduleAt = Date.now();

        this.attachActivityListeners();
        this.scheduleInactivityCheck();
      },
      error: () => {
        this._continuing.set(false);
        this.expire('expired');
      },
    });
  }

  logoutNow(): void {
    this.stop();
    this.auth.logout('manual');
  }

  private attachActivityListeners(): void {
    if (this.listenersController) {
      return;
    }

    const controller = new AbortController();

    const options: AddEventListenerOptions = {
      passive: true,
      capture: true,
      signal: controller.signal,
    };

    const events = [
      'pointerdown',
      'pointermove',
      'keydown',
      'wheel',
      'scroll',
      'touchstart',
    ] as const;

    for (const eventName of events) {
      window.addEventListener(
        eventName,
        this.handleActivity as EventListener,
        options,
      );
    }

    this.listenersController = controller;
  }

  private detachActivityListeners(): void {
    this.listenersController?.abort();
    this.listenersController = null;
  }

  private readonly handleActivity = (event: Event): void => {
    if (!event.isTrusted || this._phase() !== 'active') {
      return;
    }

    const now = Date.now();
    this.lastActivityAt = now;

    if (now - this.lastScheduleAt >= ACTIVITY_THROTTLE_MS) {
      this.lastScheduleAt = now;
      this.scheduleInactivityCheck();
    }
  };

  private scheduleInactivityCheck(): void {
    this.clearInactivityTimer();

    const remaining = Math.max(
      0,
      INACTIVITY_MS - (Date.now() - this.lastActivityAt),
    );

    this.inactivityTimer = setTimeout(() => this.checkInactivity(), remaining);
  }

  private checkInactivity(): void {
    if (this._phase() !== 'active') {
      return;
    }

    const remaining = INACTIVITY_MS - (Date.now() - this.lastActivityAt);

    if (remaining > 0) {
      this.scheduleInactivityCheck();
      return;
    }

    this.openWarning();
  }

  private openWarning(): void {
    this.clearTimers();
    this.detachActivityListeners();

    this._phase.set('warning');
    this.warningRemainingMs = WARNING_MS;
    this.warningEndsAt = Date.now() + WARNING_MS;
    this.updateSecondsLeft();

    if (document.visibilityState === 'visible') {
      this.startWarningCountdown();
    }
  }

  private startWarningCountdown(): void {
    if (this.warningTimer || this.warningRemainingMs <= 0) {
      return;
    }

    this.warningEndsAt = Date.now() + this.warningRemainingMs;
    this.updateSecondsLeft();

    this.warningTimer = setInterval(() => {
      const remaining = this.warningEndsAt - Date.now();

      if (remaining <= 0) {
        this.expire('timeout');
        return;
      }

      this.warningRemainingMs = remaining;
      this.updateSecondsLeft();
    }, 250);
  }

  private updateSecondsLeft(): void {
    this._secondsLeft.set(
      Math.max(0, Math.ceil((this.warningEndsAt - Date.now()) / 1000)),
    );
  }

  private onVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      if (this._phase() === 'warning' && this.warningTimer) {
        this.warningRemainingMs = Math.max(
          0,
          this.warningEndsAt - Date.now(),
        );
        this.clearWarningTimer();
      }
      return;
    }

    if (this._phase() === 'active') {
      this.checkInactivity();
      return;
    }

    if (this._phase() === 'warning') {
      if (this.warningRemainingMs <= 0) {
        this.expire('timeout');
        return;
      }

      this.startWarningCountdown();
    }
  }

  private expire(reason: 'timeout' | 'expired'): void {
    if (this._phase() === 'idle') {
      return;
    }

    this.stop();
    this.auth.logout(reason);
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  private clearWarningTimer(): void {
    if (this.warningTimer !== null) {
      clearInterval(this.warningTimer);
      this.warningTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearInactivityTimer();
    this.clearWarningTimer();
  }
}