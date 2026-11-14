import {
  Component,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BranchResponse } from '../../../branches/models/branch.model';
import { BranchService } from '../../../branches/services/branch';
import {
  WEEK_DAYS,
  WorkDay,
} from '../../../users/models/user-registration.model';
import {
  VeterinarianResponse,
  VeterinarianUpdateRequest,
} from '../../models/veterinarian.model';
import { VeterinarianService } from '../../services/veterinarian';

function timeRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('workStartTime')?.value;
  const end = group.get('workEndTime')?.value;

  if (!start || !end) {
    return null;
  }

  return start < end ? null : { timeRange: true };
}

@Component({
  selector: 'app-veterinarian-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './veterinarian-form.html',
  styleUrl: './veterinarian-form.css',
})
export class VeterinarianForm implements OnInit {
  private fb = inject(FormBuilder);
  private veterinarianService = inject(VeterinarianService);
  private branchService = inject(BranchService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formHeading = viewChild<ElementRef<HTMLElement>>('formHeading');

  readonly weekDays = WEEK_DAYS;

  externalId = signal<string | null>(null);
  saving = signal<boolean>(false);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  loadError = signal<string | null>(null);
  loadErrorRetryable = signal<boolean>(false);
  notFound = signal<boolean>(false);
  branches = signal<BranchResponse[]>([]);
  branchesLoadError = signal<boolean>(false);

  veterinarianForm: FormGroup = this.fb.group(
    {
      firstName: ['', [Validators.required, Validators.pattern(/\S/)]],
      lastName: ['', [Validators.required, Validators.pattern(/\S/)]],
      licenseNumber: ['', [Validators.required, Validators.pattern(/\S/)]],
      phone: ['', [Validators.required, Validators.pattern(/\S/)]],
      email: ['', [Validators.required, Validators.email]],
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
      branchExternalId: [''],
    },
    { validators: timeRangeValidator },
  );

  ngOnInit(): void {
    const externalId = this.route.snapshot.paramMap.get('externalId');

    if (!externalId) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.externalId.set(externalId);
    this.loadBranches();
    this.loadVeterinarian(externalId);
  }

  loadBranches(): void {
    this.branchesLoadError.set(false);

    this.branchService.getAll().subscribe({
      next: (branches) => {
        this.branches.set(branches);
      },
      error: () => {
        this.branches.set([]);
        this.branchesLoadError.set(true);
      },
    });
  }

  loadVeterinarian(externalId: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.loadErrorRetryable.set(false);
    this.notFound.set(false);

    this.veterinarianService.getById(externalId).subscribe({
      next: (veterinarian) => {
        this.patchVeterinarian(veterinarian);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);

        const status = err?.status;
        const retryable =
          status === 0 || status === 408 || status === 429 || status >= 500;
        this.loadErrorRetryable.set(retryable);

        if (status === 404) {
          this.notFound.set(true);
        } else if (status === 401) {
          this.loadError.set(
            'No tenés autorización para editar este veterinario. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.loadError.set('No tenés permisos para editar este veterinario.');
        } else if (status === 0) {
          this.loadError.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (status >= 500 || status === 408 || status === 429) {
          this.loadError.set(
            'No pudimos cargar los datos del veterinario. Intentá nuevamente en unos minutos.',
          );
        } else {
          this.loadError.set('No pudimos cargar los datos del veterinario.');
        }
      },
    });
  }

  private patchVeterinarian(veterinarian: VeterinarianResponse): void {
    const workDays = new Set(veterinarian.workDays ?? []);

    this.veterinarianForm.patchValue({
      firstName: veterinarian.firstName,
      lastName: veterinarian.lastName,
      licenseNumber: veterinarian.licenseNumber,
      phone: veterinarian.phone,
      email: veterinarian.email,
      workStartTime: veterinarian.workStartTime
        ? veterinarian.workStartTime.slice(0, 5)
        : '',
      workEndTime: veterinarian.workEndTime
        ? veterinarian.workEndTime.slice(0, 5)
        : '',
      workDays: Object.fromEntries(
        WEEK_DAYS.map((day) => [day.value, workDays.has(day.value)]),
      ),
      branchExternalId: veterinarian.branch?.externalId ?? '',
    });
  }

  retryLoad(): void {
    const externalId = this.externalId();

    if (externalId) {
      this.loadVeterinarian(externalId);
      this.formHeading()?.nativeElement.focus();
    }
  }

  onSubmit(): void {
    const externalId = this.externalId();

    if (!externalId || this.veterinarianForm.invalid || this.saving()) {
      this.veterinarianForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.veterinarianForm.disable();

    const raw = this.veterinarianForm.getRawValue();
    const payload: VeterinarianUpdateRequest = {
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      licenseNumber: raw.licenseNumber.trim(),
      phone: raw.phone.trim(),
      email: raw.email.trim(),
      workStartTime: raw.workStartTime,
      workEndTime: raw.workEndTime,
      workDays: WEEK_DAYS.filter(
        (day) => raw.workDays[day.value],
      ).map((day) => day.value as WorkDay),
    };

    if (raw.branchExternalId) {
      payload.branchExternalId = raw.branchExternalId;
    }

    this.veterinarianService.update(externalId, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/veterinarians', externalId]);
      },
      error: (err) => {
        this.saving.set(false);
        this.veterinarianForm.enable();

        if (err?.status === 404) {
          this.error.set(
            'No encontramos el veterinario o la sucursal seleccionada.',
          );
        } else if (err?.status === 409) {
          this.error.set(
            'Ya existe un veterinario con ese email, matrícula o teléfono.',
          );
        } else if (err?.status === 400) {
          this.error.set('Datos inválidos. Revisá los campos.');
        } else if (err?.status === 401) {
          this.error.set('Tu sesión no está autorizada. Iniciá sesión nuevamente.');
        } else if (err?.status === 403) {
          this.error.set('No tenés permisos para editar veterinarios.');
        } else if (err?.status === 0) {
          this.error.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (err?.status >= 500 || err?.status === 408 || err?.status === 429) {
          this.error.set(
            'No pudimos actualizar el veterinario. Intentá nuevamente en unos minutos.',
          );
        } else {
          this.error.set('No pudimos actualizar el veterinario. Intentá nuevamente.');
        }
      },
    });
  }
}
