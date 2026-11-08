import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BranchResponse } from '../../../branches/models/branch.model';
import { BranchService } from '../../../branches/services/branch';
import {
  AdminUserRole,
  WEEK_DAYS,
  WorkDay,
} from '../../models/user-registration.model';
import { UserRegistrationService } from '../../services/user-registration';

@Component({
  selector: 'app-user-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './user-register.html',
  styleUrl: './user-register.css',
})
export class UserRegister implements OnInit {
  private fb = inject(FormBuilder);
  private branchService = inject(BranchService);
  private userRegistrationService = inject(UserRegistrationService);

  readonly weekDays = WEEK_DAYS;

  branches = signal<BranchResponse[]>([]);
  loadingBranches = signal<boolean>(false);
  branchesError = signal<string | null>(null);
  branchesErrorRetryable = signal<boolean>(false);
  isVeterinarian = signal<boolean>(true);
  saving = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  userForm: FormGroup = this.fb.group({
    role: ['VETERINARIAN' as AdminUserRole, [Validators.required]],
    firstName: ['', [Validators.required, Validators.pattern(/\S/)]],
    lastName: ['', [Validators.required, Validators.pattern(/\S/)]],
    phone: ['', [Validators.required, Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    branchExternalId: ['', [Validators.required]],
    licenseNumber: ['', [Validators.required, Validators.pattern(/\S/)]],
    workStartTime: ['', [Validators.required]],
    workEndTime: ['', [Validators.required]],
    workDays: this.fb.group({
      MONDAY: [false],
      TUESDAY: [false],
      WEDNESDAY: [false],
      THURSDAY: [false],
      FRIDAY: [false],
      SATURDAY: [false],
      SUNDAY: [false],
    }),
  });

  constructor() {
    this.userForm.get('role')?.valueChanges.subscribe((role) => {
      this.syncRoleControls(role as AdminUserRole);
    });
  }

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches(): void {
    this.loadingBranches.set(true);
    this.branchesError.set(null);
    this.branchesErrorRetryable.set(false);

    this.branchService.getAll().subscribe({
      next: (branches) => {
        this.branches.set(branches);
        this.loadingBranches.set(false);
      },
      error: (err) => {
        this.loadingBranches.set(false);

        const status = err?.status;
        const retryable =
          status === 0 || status === 408 || status === 429 || status >= 500;
        this.branchesErrorRetryable.set(retryable);

        if (status === 401) {
          this.branchesError.set(
            'Tu sesión no está autorizada. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.branchesError.set('No tenés permisos para consultar sucursales.');
        } else if (status === 0) {
          this.branchesError.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (status >= 500 || status === 408 || status === 429) {
          this.branchesError.set(
            'No pudimos cargar las sucursales. Intentá nuevamente en unos minutos.',
          );
        } else {
          this.branchesError.set('No pudimos cargar las sucursales.');
        }
      },
    });
  }

  syncRoleControls(role: AdminUserRole): void {
    const isVeterinarian = role === 'VETERINARIAN';
    this.isVeterinarian.set(isVeterinarian);

    const veterinarianControls = [
      'licenseNumber',
      'workStartTime',
      'workEndTime',
      'workDays',
    ];

    for (const name of veterinarianControls) {
      const control = this.userForm.get(name);

      if (!control) {
        continue;
      }

      if (isVeterinarian) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }
  }

  onSubmit(): void {
    if (this.userForm.invalid || this.saving()) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    this.userForm.disable();

    const raw = this.userForm.getRawValue();
    const role = raw.role as AdminUserRole;
    const common = {
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      phone: raw.phone.trim(),
      email: raw.email.trim(),
      password: raw.password,
      branchExternalId: raw.branchExternalId,
    };

    const request$ =
      role === 'VETERINARIAN'
        ? this.userRegistrationService.createVeterinarian({
            ...common,
            licenseNumber: raw.licenseNumber.trim(),
            workStartTime: raw.workStartTime,
            workEndTime: raw.workEndTime,
            workDays: WEEK_DAYS.filter(
              (day) => raw.workDays[day.value],
            ).map((day) => day.value as WorkDay),
          })
        : this.userRegistrationService.createReceptionist(common);

    request$.subscribe({
      next: (created) => {
        this.saving.set(false);
        this.success.set(
          `Usuario ${created.firstName} ${created.lastName} registrado correctamente.`,
        );
        this.resetForm();
      },
      error: (err) => {
        this.saving.set(false);
        this.userForm.enable();
        this.syncRoleControls(role);

        if (err?.status === 404) {
          this.error.set('La sucursal seleccionada ya no existe.');
        } else if (err?.status === 409) {
          this.error.set(
            'Ya existe un usuario con ese email, teléfono o matrícula.',
          );
        } else if (err?.status === 400) {
          this.error.set('Datos inválidos. Revisá los campos.');
        } else if (err?.status === 401) {
          this.error.set('Tu sesión no está autorizada. Iniciá sesión nuevamente.');
        } else if (err?.status === 403) {
          this.error.set('No tenés permisos para registrar usuarios.');
        } else if (err?.status === 0) {
          this.error.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (err?.status >= 500 || err?.status === 408 || err?.status === 429) {
          this.error.set(
            'No pudimos registrar el usuario. Intentá nuevamente en unos minutos.',
          );
        } else {
          this.error.set('No pudimos registrar el usuario. Intentá nuevamente.');
        }
      },
    });
  }

  private resetForm(): void {
    this.userForm.reset({
      role: 'VETERINARIAN',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      branchExternalId: '',
      licenseNumber: '',
      workStartTime: '',
      workEndTime: '',
      workDays: {
        MONDAY: false,
        TUESDAY: false,
        WEDNESDAY: false,
        THURSDAY: false,
        FRIDAY: false,
        SATURDAY: false,
        SUNDAY: false,
      },
    });
    this.userForm.enable();
    this.syncRoleControls('VETERINARIAN');
  }
}
