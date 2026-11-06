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
    import { AnimalTypeResponse } from '../../../animal-types/models/animal-type.model';
    import { AnimalTypeService } from '../../../animal-types/services/animal-type';
    import { BreedResponse } from '../../../breeds/models/breed.model';
    import { BreedService } from '../../../breeds/services/breed';
    import { OwnerResponse } from '../../../owners/models/owner.model';
    import { OwnerService } from '../../../owners/services/owner';
    import { OwnerByPetService } from '../../../owners-by-pets/services/owner-by-pet';
    import { PetRequest } from '../../models/pet.model';
    import { PetService } from '../../services/pet';
    
    @Component({
      selector: 'app-pet-form',
      standalone: true,
      imports: [ReactiveFormsModule, RouterLink],
      templateUrl: './pet-form.html',
      styleUrl: './pet-form.css',
    })
    export class PetForm implements OnInit {
      private fb = inject(FormBuilder);
      private petService = inject(PetService);
      private animalTypeService = inject(AnimalTypeService);
      private breedService = inject(BreedService);
      private ownerService = inject(OwnerService);
      private ownerByPetService = inject(OwnerByPetService);
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
    
      animalTypes = signal<AnimalTypeResponse[]>([]);
      breeds = signal<BreedResponse[]>([]);
      owners = signal<OwnerResponse[]>([]);
    
      petForm: FormGroup = this.fb.group({
        name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)]],
        birthDate: ['', [Validators.required]],
        color: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(30)]],
        animalTypeName: ['', [Validators.required]],
        breedName: ['', [Validators.required]],
        ownerExternalId: [''], // Selector de dueño
      });
    
      ngOnInit(): void {
        this.loadCatalogs();
    
        const externalId = this.route.snapshot.paramMap.get('externalId');
        if (externalId) {
          this.externalId.set(externalId);
          this.editando.set(true);
          this.loadPet(externalId);
        }
        // Si viene con el parámetro ?ownerId=... desde la ficha del dueño, lo preseleccionamos
        const preselectedOwnerId = this.route.snapshot.queryParamMap.get('ownerId');
        if (preselectedOwnerId) {
          this.petForm.patchValue({ ownerExternalId: preselectedOwnerId });
        }
      }
    
      loadCatalogs(): void {
        this.animalTypeService.getAll().subscribe({
          next: (types) => this.animalTypes.set(types),
        });
    
        this.breedService.getAll().subscribe({
          next: (breeds) => this.breeds.set(breeds),
        });
    
        this.ownerService.getAll().subscribe({
          next: (owners) => this.owners.set(owners),
        });
      }
    
      loadPet(externalId: string): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.loadErrorRetryable.set(false);
        this.notFound.set(false);
    
        this.petService.getById(externalId).subscribe({
          next: (pet) => {
            this.petForm.patchValue({
              name: pet.name,
              birthDate: pet.birthDate || '',
              color: pet.color,
              animalTypeName: pet.animalType?.name || '',
              breedName: pet.breed?.name || '',
            });
    
            // Buscar si ya tiene dueño asignado
            this.ownerByPetService.getAll().subscribe({
              next: (relations) => {
                const rel = relations.find((r) => r.pet?.externalId === externalId);
                if (rel?.owner?.externalId) {
                  this.petForm.patchValue({ ownerExternalId: rel.owner.externalId });
                }
                this.loading.set(false);
              },
              error: () => this.loading.set(false),
            });
          },
          error: (err) => {
            this.loading.set(false);
            if (err?.status === 404) {
              this.notFound.set(true);
            } else {
              this.loadError.set('No pudimos cargar los datos de la mascota.');
            }
          },
        });
      }
    
      retryLoad(): void {
        const externalId = this.externalId();
        if (externalId) {
          this.loadPet(externalId);
          this.formHeading()?.nativeElement.focus();
        }
      }
    
      onSubmit(): void {
        if (this.petForm.invalid || this.saving()) {
          this.petForm.markAllAsTouched();
          return;
        }
    
        const birthDateVal = this.petForm.get('birthDate')?.value;
        if (birthDateVal && new Date(birthDateVal) > new Date()) {
          this.error.set('La fecha de nacimiento no puede ser posterior a la fecha actual.');
          return;
        }
    
        this.saving.set(true);
        this.error.set(null);
        this.petForm.disable();
    
        const raw = this.petForm.getRawValue();
        const petRequest: PetRequest = {
          name: raw.name.trim(),
          birthDate: raw.birthDate,
          color: raw.color.trim(),
          animalType: { name: raw.animalTypeName },
          breed: { name: raw.breedName },
        };
    
        const externalId = this.externalId();
        const isEditing = this.editando() && externalId !== null;
    
        const request$ = isEditing
          ? this.petService.update(externalId, petRequest)
          : this.petService.create(petRequest);
    
        request$.subscribe({
          next: (savedPet) => {
            const selectedOwnerId = raw.ownerExternalId;
    
            // Si se seleccionó dueño, guardamos la relación
            if (selectedOwnerId) {
              this.ownerByPetService.create({
                ownerExternalId: selectedOwnerId,
                petExternalId: savedPet.externalId,
              }).subscribe({
                next: () => {
                  this.saving.set(false);
                  this.router.navigate(['/pets']);
                },
                error: () => {
                  // Si falla la asociación, redirigimos igual porque la mascota ya se creó
                  this.saving.set(false);
                  this.router.navigate(['/pets']);
                },
              });
            } else {
              this.saving.set(false);
              this.router.navigate(['/pets']);
            }
          },
          error: (err) => {
            this.saving.set(false);
            this.petForm.enable();
            const action = isEditing ? 'actualizar' : 'crear';
            this.error.set(err?.error?.message || `No pudimos ${action} la mascota. Revisá los datos.`);
          },
        });
      }
    }