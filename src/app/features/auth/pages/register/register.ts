import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { RegisterRequest } from '../../../../core/models/auth.model';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  return password === confirmPassword ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  saving = signal<boolean>(false);
  error = signal<string | null>(null);

  registerForm: FormGroup = this.fb.group(
    {
      firstName: [
        '',
        [
          Validators.required,
          Validators.pattern(/\S/),
          Validators.minLength(2),
          Validators.maxLength(30),
        ],
      ],
      lastName: [
        '',
        [
          Validators.required,
          Validators.pattern(/\S/),
          Validators.minLength(2),
          Validators.maxLength(30),
        ],
      ],
      phone: [
        '',
        [
          Validators.required,
          Validators.pattern(/\S/),
          Validators.minLength(8),
          Validators.maxLength(20),
        ],
      ],
      email: [
        '',
        [Validators.required, Validators.email, Validators.maxLength(100)],
      ],
      dni: [
        '',
        [
          Validators.required,
          Validators.pattern(/\S/),
          Validators.minLength(7),
          Validators.maxLength(15),
        ],
      ],
      address: this.fb.group({
        street: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
        number: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)]],
        city: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)]],
        province: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)]],
        country: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)]],
      }),
      password: ['', [Validators.required, Validators.pattern(/\S/)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  get addressGroup(): FormGroup {
    return this.registerForm.get('address') as FormGroup;
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.saving()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.registerForm.disable();

    const raw = this.registerForm.getRawValue();
    const request: RegisterRequest = {
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      phone: raw.phone.trim(),
      email: raw.email.trim(),
      dni: raw.dni.trim(),
      address: {
        street: raw.address.street.trim(),
        number: raw.address.number.trim(),
        city: raw.address.city.trim(),
        province: raw.address.province.trim(),
        country: raw.address.country.trim(),
      },
      password: raw.password,
    };

    this.authService.register(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/login'], {
          queryParams: { registered: '1' },
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.registerForm.enable();

        if (err?.status === 409) {
          this.error.set('Ya existe una cuenta registrada con ese email o DNI.');
        } else if (err?.status === 400) {
          this.error.set('Datos inválidos. Revisá los campos.');
        } else if (err?.status === 0) {
          this.error.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (err?.status >= 500 || err?.status === 408 || err?.status === 429) {
          this.error.set(
            'No pudimos crear la cuenta. Intentá nuevamente en unos minutos.',
          );
        } else {
          this.error.set('No pudimos crear la cuenta. Intentá nuevamente.');
        }
      },
    });
  }
}
