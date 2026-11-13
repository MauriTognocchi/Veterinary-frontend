import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { BranchResponse } from '../../../branches/models/branch.model';
import { BranchService } from '../../../branches/services/branch';
import { OwnerWithCredentialsRequest } from '../../../owners/models/owner.model';
import { OwnerService } from '../../../owners/services/owner';
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
  private ownerService = inject(OwnerService);
  private route = inject(ActivatedRoute);

  readonly weekDays = WEEK_DAYS;

  branches = signal<BranchResponse[]>([]);
  loadingBranches = signal<boolean>(false);
  branchesError = signal<string | null>(null);
  branchesErrorRetryable = signal<boolean>(false);
  isVeterinarian = signal<boolean>(true);
  isOwnerMode = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  saving = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  private defaultRole: AdminUserRole = 'VETERINARIAN';

  userForm: FormGroup = this.fb.group({
    role: ['VETERINARIAN' as AdminUserRole, [Validators.required]],
    firstName: ['', [Validators.required, Validators.pattern(/\S/)]],
    lastName: ['', [Validators.required, Validators.pattern(/\S/)]],
    phone: ['', [Validators.required, Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email]],
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
      street: [
        '',
        [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)],
      ],
      number: [
        '',
        [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)],
      ],
      city: [
        '',
        [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)],
      ],
      province: [
        '',
        [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)],
      ],
      country: [
        '',
        [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)],
      ],
    }),
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
    this.userForm.get('dni')?.disable();
    this.addressGroup.disable();

    this.userForm.get('role')?.valueChanges.subscribe((role) => {
      this.syncRoleControls(role as AdminUserRole);
    });
  }

  get addressGroup(): FormGroup {
    return this.userForm.get('address') as FormGroup;
  }

  ngOnInit(): void {
    const mode = this.route.snapshot.data?.['mode'] as string | undefined;
    const roleParam = this.route.snapshot.queryParams?.['role'] as
      | string
      | null
      | undefined;
    const ownerMode =
      mode === 'OWNER' || roleParam === 'OWNER' || roleParam === 'CLIENT';

    this.isOwnerMode.set(ownerMode);

    if (ownerMode) {
      this.applyOwnerMode();
      return;
    }

    this.loadBranches();

    if (roleParam === 'RECEPTIONIST' || roleParam === 'VETERINARIAN') {
      this.defaultRole = roleParam as AdminUserRole;
      this.userForm.patchValue({ role: this.defaultRole }, { emitEvent: false });
    }

    this.applyStaffMode(this.defaultRole);
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
    if (this.isOwnerMode()) {
      this.isVeterinarian.set(false);
      return;
    }

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

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  private applyOwnerMode(): void {
    this.isVeterinarian.set(false);
    this.userForm.get('role')?.disable({ emitEvent: false });
    this.userForm.get('branchExternalId')?.disable({ emitEvent: false });

    for (const name of [
      'licenseNumber',
      'workStartTime',
      'workEndTime',
      'workDays',
    ]) {
      this.userForm.get(name)?.disable({ emitEvent: false });
    }

    this.userForm.get('dni')?.enable({ emitEvent: false });
    this.addressGroup.enable({ emitEvent: false });
  }

  private applyStaffMode(role: AdminUserRole): void {
    this.userForm.get('role')?.enable({ emitEvent: false });
    this.userForm.get('branchExternalId')?.enable({ emitEvent: false });
    this.userForm.get('dni')?.disable({ emitEvent: false });
    this.addressGroup.disable({ emitEvent: false });
    this.syncRoleControls(role);
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
    const ownerMode = this.isOwnerMode();

    let request$: Observable<{ firstName: string; lastName: string }>;

    if (ownerMode) {
      const ownerRequest: OwnerWithCredentialsRequest = {
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

      request$ = this.ownerService.createWithCredentials(ownerRequest);
    } else {
      const common = {
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        phone: raw.phone.trim(),
        email: raw.email.trim(),
        password: raw.password,
        branchExternalId: raw.branchExternalId,
      };

      request$ =
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
    }

    request$.subscribe({
      next: (created) => {
        this.saving.set(false);
        this.success.set(
          ownerMode
            ? `Propietario ${created.firstName} ${created.lastName} registrado correctamente. Ya puede iniciar sesión con el email y la contraseña acordada.`
            : `Usuario ${created.firstName} ${created.lastName} registrado correctamente.`,
        );
        this.resetForm();
      },
      error: (err) => this.handleSubmitError(err, role, ownerMode),
    });
  }

  private handleSubmitError(
    err: { status?: number } | null | undefined,
    role: AdminUserRole,
    ownerMode: boolean,
  ): void {
    this.saving.set(false);
    this.userForm.enable();

    if (ownerMode) {
      this.applyOwnerMode();
    } else {
      this.syncRoleControls(role);
    }

    const status = err?.status;

    if (status === 404) {
      this.error.set(
        ownerMode
          ? 'No encontramos los datos necesarios para registrar al propietario.'
          : 'La sucursal seleccionada ya no existe.',
      );
    } else if (status === 409) {
      this.error.set(
        ownerMode
          ? 'Ya existe un propietario o usuario con ese email o DNI.'
          : 'Ya existe un usuario con ese email, teléfono o matrícula.',
      );
    } else if (status === 400) {
      this.error.set('Datos inválidos. Revisá los campos.');
    } else if (status === 401) {
      this.error.set('Tu sesión no está autorizada. Iniciá sesión nuevamente.');
    } else if (status === 403) {
      this.error.set(
        ownerMode
          ? 'No tenés permisos para registrar propietarios.'
          : 'No tenés permisos para registrar usuarios.',
      );
    } else if (status === 0) {
      this.error.set(
        'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
      );
    } else if (status !== undefined && (status >= 500 || status === 408 || status === 429)) {
      this.error.set(
        ownerMode
          ? 'No pudimos registrar al propietario. Intentá nuevamente en unos minutos.'
          : 'No pudimos registrar el usuario. Intentá nuevamente en unos minutos.',
      );
    } else {
      this.error.set(
        ownerMode
          ? 'No pudimos registrar al propietario. Intentá nuevamente.'
          : 'No pudimos registrar el usuario. Intentá nuevamente.',
      );
    }
  }

  private resetForm(): void {
    this.userForm.reset({
      role: this.defaultRole,
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      dni: '',
      address: {
        street: '',
        number: '',
        city: '',
        province: '',
        country: '',
      },
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

    if (this.isOwnerMode()) {
      this.applyOwnerMode();
    } else {
      this.syncRoleControls(this.defaultRole);
    }
  }
}
