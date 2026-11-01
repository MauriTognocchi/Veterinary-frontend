import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  private route = inject (ActivatedRoute);

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

        if(returnUrl && returnUrl.startsWith('/')){
          this.router.navigateByUrl(returnUrl);
        } else{
          this.router.navigate(['/'])
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.loginForm.enable();
        if (err?.status === 401 || err?.status === 403) {
          this.error.set('Credenciales incorrectas.');
        } else {
          this.error.set('Error al iniciar sesión. Intente nuevamente.');
        }
      },
    });
  }
}
