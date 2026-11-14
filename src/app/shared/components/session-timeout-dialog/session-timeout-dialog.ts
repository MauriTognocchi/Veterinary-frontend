import { Component, inject } from '@angular/core';
import { SessionTimeoutService } from '../../../core/services/session-timeout.service';

@Component({
  selector: 'app-session-timeout-dialog',
  standalone: true,
  templateUrl: './session-timeout-dialog.html',
  styleUrl: './session-timeout-dialog.css',
})
export class SessionTimeoutDialog {
  private readonly sessionTimeout = inject(SessionTimeoutService);

  readonly secondsLeft = this.sessionTimeout.secondsLeft;
  readonly continuing = this.sessionTimeout.continuing;

  continueSession(): void {
    this.sessionTimeout.continueSession();
  }

  logout(): void {
    this.sessionTimeout.logoutNow();
  }
}