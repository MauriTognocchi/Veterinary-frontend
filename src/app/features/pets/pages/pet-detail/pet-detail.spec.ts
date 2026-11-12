import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { OwnerByPetService } from '../../../owners-by-pets/services/owner-by-pet';
import { VisitResponse } from '../../../visits/models/visit.model';
import { VisitService } from '../../../visits/services/visit';
import { PetResponse } from '../../models/pet.model';
import { PetService } from '../../services/pet';
import { PetDetail } from './pet-detail';

describe('PetDetail', () => {
  let component: PetDetail;
  let fixture: ComponentFixture<PetDetail>;
  let petService: { getById: ReturnType<typeof vi.fn> };
  let ownerByPetService: { getAll: ReturnType<typeof vi.fn> };
  let visitService: { getMedicalHistory: ReturnType<typeof vi.fn> };
  let authService: {
    hasAnyRole: ReturnType<typeof vi.fn>;
    hasAnyPermission: ReturnType<typeof vi.fn>;
  };

  const pet: PetResponse = {
    externalId: 'pet-1',
    name: 'Firulais',
    birthDate: '2020-05-05',
    active: true,
    color: 'Marrón',
    animalType: { externalId: 'animal-type-1', name: 'Perro' },
    breed: { externalId: 'breed-1', name: 'Labrador' },
  };

  const veterinarian = {
    externalId: 'vet-1',
    firstName: 'Ana',
    lastName: 'Pérez',
    licenseNumber: 'MP-123',
    phone: '123456',
    email: 'ana@example.com',
    workStartTime: '09:00',
    workEndTime: '18:00',
    workDays: null,
    active: true,
    branch: null,
  };

  const recentVisit: VisitResponse = {
    externalId: 'visit-recent',
    observations: 'Control anual',
    appointment: null,
    veterinarian,
    pet,
    visitDate: '2024-06-02T10:30:00',
  };

  const olderVisit: VisitResponse = {
    externalId: 'visit-older',
    observations: 'Vacunación',
    appointment: null,
    veterinarian,
    pet,
    visitDate: '2023-01-15T09:00:00',
  };

  function canViewClinicalRecords(): void {
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('VIEW_CLINICAL_RECORDS'),
    );
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(PetDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function findDeleteButton(): HTMLButtonElement | undefined {
    const element = fixture.nativeElement as HTMLElement;
    return Array.from(
      element.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent?.trim() === 'Eliminar');
  }

  beforeEach(async () => {
    petService = { getById: vi.fn().mockReturnValue(of(pet)) };
    ownerByPetService = { getAll: vi.fn().mockReturnValue(of([])) };
    visitService = { getMedicalHistory: vi.fn().mockReturnValue(of([])) };
    authService = {
      hasAnyRole: vi.fn().mockReturnValue(false),
      hasAnyPermission: vi.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [PetDetail],
      providers: [
        provideRouter([]),
        { provide: PetService, useValue: petService },
        { provide: OwnerByPetService, useValue: ownerByPetService },
        { provide: VisitService, useValue: visitService },
        { provide: AuthService, useValue: authService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ externalId: 'pet-1' }),
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('se crea correctamente', () => {
    createComponent();

    expect(component).toBeTruthy();
  });

  it('no consulta las relaciones con propietarios sin VIEW_OWNERS', () => {
    createComponent();

    expect(ownerByPetService.getAll).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.owner-box')).toBeNull();
  });

  it('consulta las relaciones y muestra el dueño con VIEW_OWNERS', () => {
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('VIEW_OWNERS'),
    );

    createComponent();

    expect(ownerByPetService.getAll).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.owner-box')).not.toBeNull();
  });

  it('muestra Eliminar con DELETE_PETS', () => {
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('DELETE_PETS'),
    );

    createComponent();

    expect(findDeleteButton()).toBeDefined();
  });

  it('oculta Eliminar sin DELETE_PETS', () => {
    createComponent();

    expect(findDeleteButton()).toBeUndefined();
  });

  it('no consulta ni muestra el historial sin VIEW_CLINICAL_RECORDS', () => {
    createComponent();

    expect(visitService.getMedicalHistory).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector('.medical-history-section'),
    ).toBeNull();
  });

  it('muestra el estado de carga del historial', () => {
    canViewClinicalRecords();
    const visits$ = new Subject<VisitResponse[]>();
    visitService.getMedicalHistory.mockReturnValue(visits$);

    createComponent();

    expect(visitService.getMedicalHistory).toHaveBeenCalledWith('pet-1');
    expect(fixture.nativeElement.textContent).toContain(
      'Cargando historial clínico...',
    );

    visits$.next([]);
    visits$.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Esta mascota todavía no tiene visitas clínicas registradas.',
    );
  });

  it('muestra las visitas ordenadas de más reciente a más antigua', () => {
    canViewClinicalRecords();
    visitService.getMedicalHistory.mockReturnValue(
      of([olderVisit, recentVisit]),
    );

    createComponent();

    const items = fixture.nativeElement.querySelectorAll('.visit-history-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Control anual');
    expect(items[0].textContent).toContain('Ver detalle');
    expect(
      items[0].querySelector('a')?.getAttribute('href'),
    ).toBe('/visits/visit-recent');
    expect(items[1].textContent).toContain('Vacunación');
  });

  it('muestra el error del historial y permite reintentar', () => {
    canViewClinicalRecords();
    visitService.getMedicalHistory.mockReturnValue(
      throwError(() => ({ status: 500 })),
    );

    createComponent();

    expect(fixture.nativeElement.textContent).toContain(
      'No pudimos cargar el historial clínico. Intentá nuevamente.',
    );

    const element = fixture.nativeElement as HTMLElement;
    const retryButton = Array.from(
      element.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent?.trim() === 'Reintentar');

    expect(retryButton).toBeDefined();

    visitService.getMedicalHistory.mockReturnValue(of([recentVisit]));
    retryButton!.click();
    fixture.detectChanges();

    expect(visitService.getMedicalHistory).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Control anual');
  });
});
