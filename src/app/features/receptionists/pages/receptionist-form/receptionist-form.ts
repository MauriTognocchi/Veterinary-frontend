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
    import { BranchResponse } from '../../../branches/models/branch.model';
    import { BranchService } from '../../../branches/services/branch';
    import {
      ReceptionistResponse,
      ReceptionistUpdateRequest,
    } from '../../models/receptionist.model';
    import { ReceptionistService } from '../../services/receptionist';

    @Component({
      selector: 'app-receptionist-form',
      standalone: true,
      imports: [ReactiveFormsModule, RouterLink],
      templateUrl: './receptionist-form.html',
      styleUrl: './receptionist-form.css',
    })
    export class ReceptionistForm implements OnInit {
      private fb = inject(FormBuilder);
      private receptionistService = inject(ReceptionistService);
      private branchService = inject(BranchService);
      private router = inject(Router);
      private route = inject(ActivatedRoute);
      private formHeading = viewChild<ElementRef<HTMLElement>>('formHeading');

      externalId = signal<string | null>(null);
      saving = signal<boolean>(false);
      loading = signal<boolean>(true);
      error = signal<string | null>(null);
      loadError = signal<string | null>(null);
      loadErrorRetryable = signal<boolean>(false);
      notFound = signal<boolean>(false);
      branches = signal<BranchResponse[]>([]);
      branchesLoadError = signal<boolean>(false);

      receptionistForm: FormGroup = this.fb.group({
        firstName: ['', [Validators.required, Validators.pattern(/\S/)]],
        lastName: ['', [Validators.required, Validators.pattern(/\S/)]],
        phone: ['', [Validators.required, Validators.pattern(/\S/)]],
        email: ['', [Validators.required, Validators.email]],
        branchExternalId: [''],
      });

      ngOnInit(): void {
        const externalId = this.route.snapshot.paramMap.get('externalId');

        if (!externalId) {
          this.loading.set(false);
          this.notFound.set(true);
          return;
        }

        this.externalId.set(externalId);
        this.loadBranches();
        this.loadReceptionist(externalId);
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

      loadReceptionist(externalId: string): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.loadErrorRetryable.set(false);
        this.notFound.set(false);
    
        this.receptionistService.getById(externalId).subscribe({
          next: (receptionist) => {
            this.patchReceptionist(receptionist);
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
                'No tenés autorización para editar este recepcionista. Iniciá sesión nuevamente.',
              );
            } else if (status === 403) {
              this.loadError.set('No tenés permisos para editar este recepcionista.');
            } else if (status === 0) {
              this.loadError.set(
                'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
              );
            } else if (status >= 500 || status === 408 || status === 429) {
              this.loadError.set(
                'No pudimos cargar los datos del recepcionista. Intentá nuevamente en unos minutos.',
              );
            } else {
              this.loadError.set('No pudimos cargar los datos del recepcionista.');
            }
          },
        });
      }
    
      private patchReceptionist(receptionist: ReceptionistResponse): void {
        this.receptionistForm.patchValue({
          firstName: receptionist.firstName,
          lastName: receptionist.lastName,
          phone: receptionist.phone,
          email: receptionist.email,
          branchExternalId: receptionist.branch?.externalId ?? '',
        });
      }
    
      retryLoad(): void {
        const externalId = this.externalId();
    
        if (externalId) {
          this.loadReceptionist(externalId);
          this.formHeading()?.nativeElement.focus();
        }
      }
    
      onSubmit(): void {
        const externalId = this.externalId();
    
        if (!externalId || this.receptionistForm.invalid || this.saving()) {
          this.receptionistForm.markAllAsTouched();
          return;
        }
    
        this.saving.set(true);
        this.error.set(null);
        this.receptionistForm.disable();
    
        const raw = this.receptionistForm.getRawValue();
        const payload: ReceptionistUpdateRequest = {
          firstName: raw.firstName.trim(),
          lastName: raw.lastName.trim(),
          phone: raw.phone.trim(),
          email: raw.email.trim(),
        };
    
        if (raw.branchExternalId) {
          payload.branchExternalId = raw.branchExternalId;
        }
    
        this.receptionistService.update(externalId, payload).subscribe({
          next: () => {
            this.saving.set(false);
            this.router.navigate(['/receptionists', externalId]);
          },
          error: (err) => {
            this.saving.set(false);
            this.receptionistForm.enable();
    
            if (err?.status === 404) {
              this.error.set(
                'No encontramos el recepcionista o la sucursal seleccionada.',
              );
            } else if (err?.status === 409) {
              this.error.set(
                'Ya existe un recepcionista con ese email o teléfono.',
              );
            } else if (err?.status === 400) {
              this.error.set('Datos inválidos. Revisá los campos.');
            } else if (err?.status === 401) {
              this.error.set('Tu sesión no está autorizada. Iniciá sesión nuevamente.');
            } else if (err?.status === 403) {
              this.error.set('No tenés permisos para editar recepcionistas.');
            } else if (err?.status === 0) {
              this.error.set(
                'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
              );
            } else if (err?.status >= 500 || err?.status === 408 || err?.status === 429) {
              this.error.set(
                'No pudimos actualizar el recepcionista. Intentá nuevamente en unos minutos.',
              );
            } else {
              this.error.set('No pudimos actualizar el recepcionista. Intentá nuevamente.');
            }
          },
        });
      }
    }