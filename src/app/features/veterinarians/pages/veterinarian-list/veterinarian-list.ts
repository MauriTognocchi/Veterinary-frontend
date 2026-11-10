import {
  Component,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BranchResponse } from '../../../branches/models/branch.model';
import { BranchService } from '../../../branches/services/branch';
import {
  VeterinarianFilters,
  VeterinarianResponse,
} from '../../models/veterinarian.model';
import { VeterinarianService } from '../../services/veterinarian';

@Component({
  selector: 'app-veterinarian-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  styleUrl: './veterinarian-list.css',
  templateUrl: './veterinarian-list.html',
})
export class VeterinarianList implements OnInit {
  private fb = inject(FormBuilder);
  private veterinarianService = inject(VeterinarianService);
  private branchService = inject(BranchService);
  private listHeading = viewChild<ElementRef<HTMLElement>>('listHeading');

  veterinarians = signal<VeterinarianResponse[]>([]);
  branches = signal<BranchResponse[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  loadErrorRetryable = signal<boolean>(false);
  appliedFilters = signal<boolean>(false);
  branchesLoadError = signal<boolean>(false);

  filtersForm = this.fb.nonNullable.group({
    firstName: [''],
    lastName: [''],
    licenseNumber: [''],
    branchExternalId: [''],
  });

  ngOnInit(): void {
    this.loadVeterinarians();
    this.loadBranches();
  }

  loadVeterinarians(): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadErrorRetryable.set(false);
    this.veterinarians.set([]);

    const raw = this.filtersForm.getRawValue();
    const filters: VeterinarianFilters = {
      firstName: raw.firstName,
      lastName: raw.lastName,
      licenseNumber: raw.licenseNumber,
      branchExternalId: raw.branchExternalId,
    };

    this.appliedFilters.set(
      Boolean(
        filters.firstName?.trim() ||
          filters.lastName?.trim() ||
          filters.licenseNumber?.trim() ||
          filters.branchExternalId?.trim(),
      ),
    );

    this.veterinarianService.getAll(filters).subscribe({
      next: (veterinarians) => {
        this.veterinarians.set(veterinarians);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);

        const status = err?.status;
        const retryable =
          status === 0 || status === 408 || status === 429 || status >= 500;
        this.loadErrorRetryable.set(retryable);

        if (status === 401) {
          this.error.set(
            'No tenés autorización para ver los veterinarios. Iniciá sesión nuevamente.',
          );
        } else if (status === 403) {
          this.error.set('No tenés permisos para ver los veterinarios.');
        } else if (status === 404) {
          this.error.set('No encontramos la información solicitada.');
        } else if (status === 0) {
          this.error.set(
            'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
          );
        } else if (status >= 500 || status === 408 || status === 429) {
          this.error.set(
            'No pudimos cargar los veterinarios. Intentá nuevamente en unos minutos.',
          );
        } else {
          this.error.set('No pudimos cargar los veterinarios.');
        }
      },
    });
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

  clearFilters(): void {
    this.filtersForm.reset({
      firstName: '',
      lastName: '',
      licenseNumber: '',
      branchExternalId: '',
    });
    this.loadVeterinarians();
    this.listHeading()?.nativeElement.focus();
  }

  retryLoad(): void {
    this.loadVeterinarians();
    this.listHeading()?.nativeElement.focus();
  }
}
