import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { DiagnosisResponse } from '../../../diagnoses/models/diagnosis.model';
import { DiagnosisService } from '../../../diagnoses/services/diagnosis';
import { VisitResponse } from '../../models/visit.model';
import { VisitService } from '../../services/visit';
import { VisitDetail } from './visit-detail';

describe('VisitDetail', () => {
  let component: VisitDetail;
  let fixture: ComponentFixture<VisitDetail>;
  let visitService: { getById: ReturnType<typeof vi.fn> };
  let diagnosisService: {
    getByVisit: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let authService: {
    hasAnyRole: ReturnType<typeof vi.fn>;
    hasAnyPermission: ReturnType<typeof vi.fn>;
  };

  interface AccessOptions {
    view?: boolean;
    manage?: boolean;
    remove?: boolean;
  }

  const visit: VisitResponse = {
    externalId: 'visit-1',
    observations: 'Control general',
    appointment: null,
    veterinarian: {
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
    },
    pet: {
      externalId: 'pet-1',
      name: 'Firulais',
      birthDate: '2020-05-05',
      active: true,
      color: 'Marrón',
      animalType: { externalId: 'animal-type-1', name: 'Perro' },
      breed: { externalId: 'breed-1', name: 'Labrador' },
    },
    visitDate: '2026-11-10T10:30:00',
  };

  const recentDiagnosis: DiagnosisResponse = {
    externalId: 'diag-recent',
    description: 'Dermatitis alérgica',
    dateDiagnosis: '2026-11-10T10:30:00',
    observations: 'Tratamiento con antihistamínicos.',
    visit,
  };

  const olderDiagnosis: DiagnosisResponse = {
    externalId: 'diag-older',
    description: 'Otitis externa',
    dateDiagnosis: '2026-09-01T09:00:00',
    observations: 'Limpieza y gotas óticas.',
    visit,
  };

  function configureAccess(options: AccessOptions = {}): void {
    const { view = true, manage = false, remove = false } = options;

    authService.hasAnyRole.mockImplementation((roles: readonly string[]) =>
      manage && roles.includes('ROLE_VETERINARIAN'),
    );
    authService.hasAnyPermission.mockImplementation(
      (permissions: readonly string[]) =>
        (view && permissions.includes('VIEW_CLINICAL_RECORDS')) ||
        (remove && permissions.includes('DELETE_DIAGNOSES')),
    );
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(VisitDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function findButtonByText(text: string): HTMLButtonElement | undefined {
    return Array.from(element().querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.trim() === text);
  }

  function fillDiagnosisForm(values: {
    description: string;
    dateDiagnosis: string;
    observations: string;
  }): void {
    component.diagnosisForm.setValue(values);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    visitService = {
      getById: vi.fn().mockReturnValue(of(visit)),
    };
    diagnosisService = {
      getByVisit: vi.fn().mockReturnValue(of([])),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    authService = {
      hasAnyRole: vi.fn().mockReturnValue(false),
      hasAnyPermission: vi.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [VisitDetail],
      providers: [
        provideRouter([]),
        { provide: VisitService, useValue: visitService },
        { provide: DiagnosisService, useValue: diagnosisService },
        { provide: AuthService, useValue: authService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ externalId: 'visit-1' }),
            },
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('se crea correctamente', () => {
    configureAccess();
    createComponent();

    expect(component).toBeTruthy();
  });

  it('carga la visita y los diagnósticos de la visita', () => {
    configureAccess();
    diagnosisService.getByVisit.mockReturnValue(of([recentDiagnosis]));

    createComponent();

    expect(visitService.getById).toHaveBeenCalledWith('visit-1');
    expect(diagnosisService.getByVisit).toHaveBeenCalledWith('visit-1');
    expect(element().textContent).toContain('Dermatitis alérgica');
    expect(element().textContent).toContain(
      'Tratamiento con antihistamínicos.',
    );
  });

  it('no consulta ni muestra diagnósticos sin VIEW_CLINICAL_RECORDS', () => {
    configureAccess({ view: false });

    createComponent();

    expect(visitService.getById).toHaveBeenCalledWith('visit-1');
    expect(diagnosisService.getByVisit).not.toHaveBeenCalled();
    expect(element().querySelector('.diagnoses-section')).toBeNull();
  });

  it('muestra el estado de carga y luego el estado vacío', () => {
    configureAccess();
    const diagnoses$ = new Subject<DiagnosisResponse[]>();
    diagnosisService.getByVisit.mockReturnValue(diagnoses$);

    createComponent();

    expect(element().textContent).toContain('Cargando diagnósticos...');

    diagnoses$.next([]);
    diagnoses$.complete();
    fixture.detectChanges();

    expect(element().textContent).toContain(
      'Esta visita todavía no tiene diagnósticos registrados.',
    );
  });

  it('ordena los diagnósticos del más reciente al más antiguo', () => {
    configureAccess();
    diagnosisService.getByVisit.mockReturnValue(
      of([olderDiagnosis, recentDiagnosis]),
    );

    createComponent();

    const descriptions = Array.from(
      element().querySelectorAll<HTMLElement>('.diagnosis-description'),
    ).map((item) => item.textContent?.trim());

    expect(descriptions).toEqual(['Dermatitis alérgica', 'Otitis externa']);
  });

  it('muestra el error de carga y permite reintentar', () => {
    configureAccess();
    diagnosisService.getByVisit.mockReturnValue(
      throwError(() => ({ status: 500 })),
    );

    createComponent();

    expect(element().textContent).toContain(
      'No pudimos cargar los diagnósticos. Intentá nuevamente.',
    );

    const retryButton = findButtonByText('Reintentar');
    expect(retryButton).toBeDefined();

    diagnosisService.getByVisit.mockReturnValue(of([recentDiagnosis]));
    retryButton!.click();
    fixture.detectChanges();

    expect(diagnosisService.getByVisit).toHaveBeenCalledTimes(2);
    expect(element().textContent).toContain('Dermatitis alérgica');
  });

  it('no ofrece reintentar cuando el error no es recuperable', () => {
    configureAccess();
    diagnosisService.getByVisit.mockReturnValue(
      throwError(() => ({ status: 403 })),
    );

    createComponent();

    expect(element().textContent).toContain(
      'No tenés permisos para ver los diagnósticos.',
    );
    expect(findButtonByText('Reintentar')).toBeUndefined();
  });

  it('solo muestra el alta de diagnósticos a veterinarios', () => {
    configureAccess({ manage: false });
    createComponent();

    expect(findButtonByText('Agregar diagnóstico')).toBeUndefined();
  });

  it('registra un diagnóstico para la visita', () => {
    configureAccess({ manage: true });
    const created: DiagnosisResponse = {
      externalId: 'diag-new',
      description: 'Otitis',
      dateDiagnosis: '2026-11-12T10:30',
      observations: 'Control',
      visit,
    };
    diagnosisService.create.mockReturnValue(of(created));

    createComponent();
    findButtonByText('Agregar diagnóstico')!.click();
    fixture.detectChanges();

    expect(element().textContent).toContain('Nuevo diagnóstico');

    fillDiagnosisForm({
      description: 'Otitis',
      dateDiagnosis: '2026-11-12T10:30',
      observations: 'Control',
    });
    findButtonByText('Guardar diagnóstico')!.click();
    fixture.detectChanges();

    expect(diagnosisService.create).toHaveBeenCalledWith({
      description: 'Otitis',
      dateDiagnosis: '2026-11-12T10:30',
      observations: 'Control',
      visitExternalId: 'visit-1',
    });
    expect(element().textContent).toContain('Otitis');
    expect(component.diagnosisFormVisible()).toBe(false);
  });

  it('no permite abrir ni enviar el formulario mientras carga el listado', () => {
    configureAccess({ manage: true });
    const pendingList$ = new Subject<DiagnosisResponse[]>();
    diagnosisService.getByVisit.mockReturnValue(pendingList$);

    createComponent();

    const addButton = findButtonByText('Agregar diagnóstico');
    expect(addButton?.disabled).toBe(true);

    component.openCreateForm();
    fixture.detectChanges();
    expect(component.diagnosisFormVisible()).toBe(false);

    fillDiagnosisForm({
      description: 'Otitis',
      dateDiagnosis: '2026-11-12T10:30',
      observations: 'Control',
    });
    component.submitDiagnosis();
    fixture.detectChanges();

    expect(diagnosisService.create).not.toHaveBeenCalled();
    expect(component.diagnosisFormError()).toBe(
      'Esperá a que terminen de cargar los diagnósticos.',
    );

    pendingList$.next([]);
    pendingList$.complete();
    fixture.detectChanges();

    expect(component.diagnosesLoading()).toBe(false);
    expect(findButtonByText('Agregar diagnóstico')?.disabled).toBe(false);
  });

  it('una respuesta pendiente del listado no sobrescribe un diagnóstico recién creado', () => {
    configureAccess({ manage: true });

    createComponent();
    findButtonByText('Agregar diagnóstico')!.click();
    fixture.detectChanges();

    const create$ = new Subject<DiagnosisResponse>();
    diagnosisService.create.mockReturnValue(create$);

    fillDiagnosisForm({
      description: 'Otitis',
      dateDiagnosis: '2026-11-12T10:30',
      observations: 'Control',
    });
    findButtonByText('Guardar diagnóstico')!.click();
    fixture.detectChanges();

    const staleList$ = new Subject<DiagnosisResponse[]>();
    diagnosisService.getByVisit.mockReturnValue(staleList$);
    component.loadDiagnoses('visit-1');
    fixture.detectChanges();

    expect(component.diagnosesLoading()).toBe(true);

    create$.next({
      externalId: 'diag-new',
      description: 'Otitis',
      dateDiagnosis: '2026-11-12T10:30',
      observations: 'Control',
      visit,
    });
    create$.complete();
    fixture.detectChanges();

    expect(element().textContent).toContain('Otitis');
    expect(component.diagnosesLoading()).toBe(false);

    staleList$.next([olderDiagnosis]);
    staleList$.complete();
    fixture.detectChanges();

    expect(component.diagnoses().map((item) => item.externalId)).toEqual([
      'diag-new',
    ]);
    expect(element().textContent).not.toContain('Otitis externa');
  });

  it('no envía el formulario si los datos obligatorios están vacíos', () => {
    configureAccess({ manage: true });
    createComponent();

    findButtonByText('Agregar diagnóstico')!.click();
    fixture.detectChanges();

    findButtonByText('Guardar diagnóstico')!.click();
    fixture.detectChanges();

    expect(diagnosisService.create).not.toHaveBeenCalled();
    expect(element().textContent).toContain(
      'La descripción es obligatoria (máximo 1000 caracteres).',
    );
    expect(element().textContent).toContain('Las observaciones son obligatorias.');
  });

  it('muestra el error al guardar y mantiene el formulario abierto', () => {
    configureAccess({ manage: true });
    diagnosisService.create.mockReturnValue(
      throwError(() => ({ status: 403 })),
    );

    createComponent();
    findButtonByText('Agregar diagnóstico')!.click();
    fixture.detectChanges();

    fillDiagnosisForm({
      description: 'Otitis',
      dateDiagnosis: '2026-11-12T10:30',
      observations: 'Control',
    });
    findButtonByText('Guardar diagnóstico')!.click();
    fixture.detectChanges();

    expect(element().textContent).toContain(
      'Solo los veterinarios pueden registrar o editar diagnósticos.',
    );
    expect(component.diagnosisFormVisible()).toBe(true);
  });

  it('edita un diagnóstico existente', () => {
    configureAccess({ manage: true });
    diagnosisService.getByVisit.mockReturnValue(of([recentDiagnosis]));
    const updated: DiagnosisResponse = {
      ...recentDiagnosis,
      description: 'Dermatitis actualizada',
    };
    diagnosisService.update.mockReturnValue(of(updated));

    createComponent();

    const editButton = element().querySelector<HTMLButtonElement>(
      '.diagnosis-edit-btn',
    );
    expect(editButton).not.toBeNull();
    editButton!.click();
    fixture.detectChanges();

    expect(component.editingDiagnosis()?.externalId).toBe('diag-recent');
    expect(
      (element().querySelector('#diagnosisDescription') as HTMLInputElement)
        .value,
    ).toBe('Dermatitis alérgica');
    expect(element().textContent).toContain('Editar diagnóstico');

    fillDiagnosisForm({
      description: 'Dermatitis actualizada',
      dateDiagnosis: '2026-11-10T10:30',
      observations: 'Tratamiento con antihistamínicos.',
    });
    findButtonByText('Guardar diagnóstico')!.click();
    fixture.detectChanges();

    expect(diagnosisService.update).toHaveBeenCalledWith('diag-recent', {
      description: 'Dermatitis actualizada',
      dateDiagnosis: '2026-11-10T10:30',
      observations: 'Tratamiento con antihistamínicos.',
      visitExternalId: 'visit-1',
    });
    expect(element().textContent).toContain('Dermatitis actualizada');
  });

  it('solo muestra eliminar con DELETE_DIAGNOSES', () => {
    configureAccess({ remove: false });
    diagnosisService.getByVisit.mockReturnValue(of([recentDiagnosis]));

    createComponent();

    expect(element().querySelector('.diagnosis-delete-btn')).toBeNull();
  });

  it('elimina un diagnóstico confirmado', () => {
    configureAccess({ remove: true });
    diagnosisService.getByVisit.mockReturnValue(of([recentDiagnosis]));
    diagnosisService.delete.mockReturnValue(of(void 0));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    createComponent();

    const deleteButton = element().querySelector<HTMLButtonElement>(
      '.diagnosis-delete-btn',
    );
    expect(deleteButton).not.toBeNull();
    deleteButton!.click();
    fixture.detectChanges();

    expect(window.confirm).toHaveBeenCalled();
    expect(diagnosisService.delete).toHaveBeenCalledWith('diag-recent');
    expect(element().textContent).not.toContain('Dermatitis alérgica');
    expect(element().textContent).toContain(
      'Esta visita todavía no tiene diagnósticos registrados.',
    );
  });
});
