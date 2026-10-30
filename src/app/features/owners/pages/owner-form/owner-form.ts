import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OwnerService } from '../../services/owner';
import { OwnerRequest } from '../../models/owner.model';

@Component({
  selector: 'app-owner-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './owner-form.html',
  styleUrl: './owner-form.css',
})
export class OwnerForm implements OnInit {
  private fb = inject(FormBuilder);
  private ownerService = inject(OwnerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  editando = signal<boolean>(false);
  externalId = signal<string | null>(null);
  saving = signal<boolean>(false);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  loadError = signal<string | null>(null);
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

  ngOnInit(): void {
    const externalId = this.route.snapshot.paramMap.get('externalId');

    if (externalId) {
      this.externalId.set(externalId);
      this.editando.set(true);
      this.loadOwner(externalId);
    }
  }

  get addressGroup(): FormGroup {
    return this.ownerForm.get('address') as FormGroup;
  }

  loadOwner(externalId: string): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.ownerService.getById(externalId).subscribe({
      next: (owner) => {
        this.ownerForm.patchValue({
          firstName: owner.firstName,
          lastName: owner.lastName,
          phone: owner.phone,
          email: owner.email,
          dni: owner.dni,
          address: owner.address
            ? {
                street: owner.address.street,
                number: owner.address.number,
                city: owner.address.city,
                province: owner.address.province,
                country: owner.address.country,
              }
            : {
                street: '',
                number: '',
                city: '',
                province: '',
                country: '',
              },
        });

        if (owner.address) {
          this.hasAddress.set(true);
          this.addressGroup.enable();
        } else {
          this.hasAddress.set(false);
          this.addressGroup.disable();
        }

        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 404) {
          this.loadError.set('No se encontró el propietario solicitado.');
        } else if (err?.status === 401) {
          this.loadError.set('No autorizado. Es necesario autenticarse para editar el propietario.');
        } else if (err?.status === 403) {
          this.loadError.set('Acceso denegado. No tiene permisos para editar el propietario.');
        } else {
          this.loadError.set('Error al cargar el propietario.');
        }
      },
    });
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

    const externalId = this.externalId();
    const isEditing = this.editando() && externalId !== null;

    const request$ = isEditing
      ? this.ownerService.update(externalId, owner)
      : this.ownerService.create(owner);

    request$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        if (isEditing) {
          this.router.navigate(['/owners', saved.externalId]);
        } else {
          this.router.navigate(['/owners']);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.ownerForm.enable();
        if (!this.hasAddress()) {
          this.addressGroup.disable();
        }

        const action = isEditing ? 'actualizar' : 'crear';

        if (err?.status === 404) {
          this.error.set('El propietario ya no existe.');
        } else if (err?.status === 409) {
          this.error.set(err?.error?.message ?? 'Ya existe un propietario con ese DNI o email.');
        } else if (err?.status === 400) {
          this.error.set(err?.error?.message ?? 'Datos inválidos. Revise los campos.');
        } else if (err?.status === 401 || err?.status === 403) {
          this.error.set(`No tiene permisos para ${action} propietarios.`);
        } else {
          this.error.set(`Error al ${action} el propietario. Intente nuevamente.`);
        }
      },
    });
  }
}
