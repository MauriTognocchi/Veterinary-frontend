import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OwnerService } from '../../services/owner';
import { OwnerRequest } from '../../models/owner.model';

@Component({
  selector: 'app-owner-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './owner-form.html',
  styleUrl: './owner-form.css',
})
export class OwnerForm {
  private fb = inject(FormBuilder);
  private ownerService = inject(OwnerService);
  private router = inject(Router);

  saving = signal<boolean>(false);
  error = signal<string | null>(null);
  hasAddress = signal<boolean>(false);

  ownerForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]],
    phone: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    dni: ['', [Validators.required, Validators.minLength(7), Validators.maxLength(15)]],
    address: this.fb.group({
      street: ['', [Validators.required, Validators.maxLength(100)]],
      number: ['', [Validators.required, Validators.maxLength(50)]],
      city: ['', [Validators.required, Validators.maxLength(50)]],
      province: ['', [Validators.required, Validators.maxLength(50)]],
      country: ['', [Validators.required, Validators.maxLength(50)]],
    }),
  });

  constructor() {
    this.addressGroup.disable();
  }

  get addressGroup(): FormGroup {
    return this.ownerForm.get('address') as FormGroup;
  }

  toggleAddress(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.hasAddress.set(checked);

    if (checked) {
      this.addressGroup.enable();
    } else {
      this.addressGroup.reset();
      this.addressGroup.disable();
    }
  }

  onSubmit(): void {
    if (this.ownerForm.invalid || this.saving()) {
      this.ownerForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.ownerForm.disable();

    const raw = this.ownerForm.getRawValue();
    const owner: OwnerRequest = {
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      phone: raw.phone.trim(),
      email: raw.email.trim(),
      dni: raw.dni.trim(),
      address: this.hasAddress()
        ? {
            street: raw.address.street.trim(),
            number: raw.address.number.trim(),
            city: raw.address.city.trim(),
            province: raw.address.province.trim(),
            country: raw.address.country.trim(),
          }
        : null,
    };

    this.ownerService.create(owner).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/owners']);
      },
      error: (err) => {
        this.saving.set(false);
        this.ownerForm.enable();
        if (!this.hasAddress()) {
          this.addressGroup.disable();
        }

        if (err?.status === 409) {
          this.error.set(err?.error?.message ?? 'Ya existe un propietario con ese DNI o email.');
        } else if (err?.status === 400) {
          this.error.set(err?.error?.message ?? 'Datos inválidos. Revise los campos.');
        } else if (err?.status === 401 || err?.status === 403) {
          this.error.set('No tiene permisos para crear propietarios.');
        } else {
          this.error.set('Error al crear el propietario. Intente nuevamente.');
        }
      },
    });
  }
}
