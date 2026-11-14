import {
  Component,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BranchRequest } from '../../models/branch.model';
import { BranchService } from '../../services/branch';

@Component({
  selector: 'app-branch-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './branch-form.html',
  styleUrl: './branch-form.css',
})
export class BranchForm implements OnInit {
  private fb = inject(FormBuilder);
  private branchService = inject(BranchService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formHeading = viewChild<ElementRef<HTMLElement>>('formHeading');

  editando = signal<boolean>(false);
  externalId = signal<string | null>(null);
  saving = signal<boolean>(false);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  loadError = signal<string | null>(null);
  loadErrorRetryable = signal<boolean>(false);
  notFound = signal<boolean>(false);

  branchForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)]],
    phone: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
    openingTime: ['', [Validators.required]],
    closingTime: ['', [Validators.required]],
    address: this.fb.group({
      street: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
      number: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)]],
      city: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)]],
      province: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)]],
      country: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)]],
    }),
  });

  ngOnInit(): void {
    const externalId = this.route.snapshot.paramMap.get('externalId');

    if (externalId) {
      this.externalId.set(externalId);
      this.editando.set(true);
      this.loadBranch(externalId);
    }
  }

  get addressGroup(): FormGroup {
    return this.branchForm.get('address') as FormGroup;
  }

  loadBranch(externalId: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.loadErrorRetryable.set(false);
    this.notFound.set(false);

    this.branchService.getById(externalId).subscribe({
      next: (branch) => {
        this.branchForm.patchValue({
          name: branch.name,
          phone: branch.phone,
          email: branch.email,
          openingTime: branch.openingTime ? branch.openingTime.slice(0, 5) : '',
          closingTime: branch.closingTime ? branch.closingTime.slice(0, 5) : '',
          address: branch.address
            ? {
                street: branch.address.street,
                number: branch.address.number,
                city: branch.address.city,
                province: branch.address.province,
                country: branch.address.country,
              }
            : {
                street: '',
                number: '',
                city: '',
                province: '',
                country: '',
              },
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);

        const status = err?.status;
        const retryable = status === 0 || status === 408 || status === 429 || status >= 500;
        this.loadErrorRetryable.set(retryable);

        if (status === 404) {
          this.notFound.set(true);
        } else if (status === 401) {
          this.loadError.set(
            'No tenés autorización para editar esta sucursal. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.loadError.set('No tenés permisos para editar esta sucursal.');
        } else if (status === 0) {
          this.loadError.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (status >= 500 || status === 408 || status === 429) {
          this.loadError.set(
            'No pudimos cargar los datos de la sucursal. Intentá nuevamente en unos minutos.',
          );
        } else {
          this.loadError.set('No pudimos cargar los datos de la sucursal.');
        }
      },
    });
  }

  retryLoad(): void {
    const externalId = this.externalId();

    if (externalId) {
      this.loadBranch(externalId);
      this.formHeading()?.nativeElement.focus();
    }
  }

  onSubmit(): void {
    if (this.branchForm.invalid || this.saving()) {
      this.branchForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.branchForm.disable();

    const raw = this.branchForm.getRawValue();
    const branch: BranchRequest = {
      name: raw.name.trim(),
      phone: raw.phone.trim(),
      email: raw.email.trim(),
      openingTime: raw.openingTime,
      closingTime: raw.closingTime,
      address: {
        street: raw.address.street.trim(),
        number: raw.address.number.trim(),
        city: raw.address.city.trim(),
        province: raw.address.province.trim(),
        country: raw.address.country.trim(),
      },
    };

    const externalId = this.externalId();
    const isEditing = this.editando() && externalId !== null;

    const request$ = isEditing
      ? this.branchService.update(externalId, branch)
      : this.branchService.create(branch);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/branches']);
      },
      error: (err) => {
        this.saving.set(false);
        this.branchForm.enable();

        const action = isEditing ? 'actualizar' : 'crear';

        if (err?.status === 404) {
          this.error.set('La sucursal ya no existe.');
        } else if (err?.status === 409) {
          this.error.set('Ya existe una sucursal con ese nombre, teléfono o email.');
        } else if (err?.status === 400) {
          this.error.set('Datos inválidos. Revisá los campos.');
        } else if (err?.status === 401) {
          this.error.set('Tu sesión no está autorizada. Iniciá sesión nuevamente.');
        } else if (err?.status === 403) {
          this.error.set(`No tenés permisos para ${action} sucursales.`);
        } else if (err?.status === 0) {
          this.error.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (err?.status >= 500 || err?.status === 408 || err?.status === 429) {
          this.error.set(
            `No pudimos ${action} la sucursal. Intentá nuevamente en unos minutos.`,
          );
        } else {
          this.error.set(`No pudimos ${action} la sucursal. Intentá nuevamente.`);
        }
      },
    });
  }
}
