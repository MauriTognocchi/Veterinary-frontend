import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './shared/components/header/header';
import { Footer } from './shared/components/footer/footer';
import { SessionTimeoutDialog } from './shared/components/session-timeout-dialog/session-timeout-dialog';
import { SessionTimeoutService } from './core/services/session-timeout.service';

@Component({
  imports: [RouterOutlet, Header, Footer, SessionTimeoutDialog],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('Veterinary-frontend');

  protected readonly sessionTimeout = inject(SessionTimeoutService);
}

