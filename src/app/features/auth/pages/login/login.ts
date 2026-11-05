import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly logoutReason = this.route.snapshot.queryParamMap.get('reason');

  loginForm: FormGroup = this.fb.group({
    username: [{ value: '', disabled: false }, [Validators.required]],
    password: [{ value: '', disabled: false }, [Validators.required]],
  });

  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  onSubmit(): void {
    if (this.loginForm.invalid || this.loading()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.loginForm.disable();

    const { username, password } = this.loginForm.getRawValue();

    this.authService.login({ username, password }).subscribe({
      next: () => {
        this.loading.set(false);

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

        if (returnUrl && returnUrl.startsWith('/')) {
          this.router.navigateByUrl(returnUrl);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.loginForm.enable();

        if (err?.status === 401) {
          this.error.set('Credenciales incorrectas.');
        } else if (err?.status === 403) {
          this.error.set('No tenés permisos para acceder.');
        } else if (err?.status === 0) {
          this.error.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (err?.status >= 500 || err?.status === 408 || err?.status === 429) {
          this.error.set('No pudimos iniciar sesión. Intentá nuevamente en unos minutos.');
        } else {
          this.error.set('No pudimos iniciar sesión. Intentá nuevamente.');
        }
      },
    });
  }
}
