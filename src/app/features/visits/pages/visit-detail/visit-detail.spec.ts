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
import { MedicationResponse } from '../../../medications/models/medication.model';
import { MedicationService } from '../../../medications/services/medication';
import { PrescriptionResponse } from '../../../prescriptions/models/prescription.model';
import { PrescriptionService } from '../../../prescriptions/services/prescription';
import {
  StudyByVisitResponse,
  StudyResponse,
} from '../../../studies/models/study.model';
import { StudyService } from '../../../studies/services/study';
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
  let studyService: {
    getAll: ReturnType<typeof vi.fn>;
    getAssociations: ReturnType<typeof vi.fn>;
    associate: ReturnType<typeof vi.fn>;
    deactivateAssociation: ReturnType<typeof vi.fn>;
  };
  let prescriptionService: {
    getByVisit: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let medicationService: { getAll: ReturnType<typeof vi.fn> };

  interface AccessOptions {
    view?: boolean;
    manage?: boolean;
    remove?: boolean;
    addStudies?: boolean;
    removeStudies?: boolean;
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
      description: null,
      animalType: { externalId: 'animal-type-1', name: 'Perro' },
      breed: {
        externalId: 'breed-1',
        name: 'Labrador',
        animalType: { externalId: 'animal-type-1', name: 'Perro' },
      },
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

  const radiographyStudy: StudyResponse = {
    externalId: 'study-radiography',
    name: 'Radiografía',
    description: 'Radiografía de tórax.',
  };

  const bloodStudy: StudyResponse = {
    externalId: 'study-blood',
    name: 'Análisis de sangre',
    description: 'Hemograma completo.',
  };

  const urineStudy: StudyResponse = {
    externalId: 'study-urine',
    name: 'Análisis de orina',
    description: 'Urianálisis completo.',
  };

  const radiographyAssociation: StudyByVisitResponse = {
    externalId: 'assoc-radiography',
    study: radiographyStudy,
    visit,
    active: true,
    description: null,
  };

  const amoxicillin: MedicationResponse = {
    externalId: 'med-amoxicillin',
    name: 'Amoxicilina',
    dosage: 250,
    dosageUnit: 'mg',
  };

  const meloxicam: MedicationResponse = {
    externalId: 'med-meloxicam',
    name: 'Meloxicam',
    dosage: 1,
    dosageUnit: 'mg',
  };

  const recentPrescription: PrescriptionResponse = {
    externalId: 'presc-recent',
    quantity: 10,
    indication: 'Cada 12 horas por 7 días.',
    expirationDate: '2026-12-10',
    active: true,
    medication: amoxicillin,
    diagnosis: recentDiagnosis,
  };

  function configureAccess(options: AccessOptions = {}): void {
    const {
      view = true,
      manage = false,
      remove = false,
      addStudies = false,
      removeStudies = false,
    } = options;

    authService.hasAnyRole.mockImplementation((roles: readonly string[]) =>
      (manage && roles.includes('ROLE_VETERINARIAN')) ||
      (removeStudies && roles.includes('ROLE_ADMIN')),
    );
    authService.hasAnyPermission.mockImplementation(
      (permissions: readonly string[]) =>
        (view && permissions.includes('VIEW_CLINICAL_RECORDS')) ||
        (remove && permissions.includes('DELETE_DIAGNOSES')) ||
        (addStudies && permissions.includes('CREATE_CLINICAL_RECORDS')) ||
        (manage && permissions.includes('VIEW_MEDICATIONS')),
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

  function selectStudy(externalId: string): void {
    component.studyForm.setValue({ studyExternalId: externalId, description: 'Resultado' });
    fixture.detectChanges();
  }

  function studyOptions(): string[] {
    const select =
      element().querySelector<HTMLSelectElement>('#studyExternalId');

    return select
      ? Array.from(select.options).map(
          (option) => option.textContent?.trim() ?? '',
        )
      : [];
  }

  function fillPrescriptionForm(values: {
    quantity: number;
    indication: string;
    expirationDate: string;
    medicationExternalId: string;
    diagnosisExternalId: string;
  }): void {
    component.prescriptionForm.setValue(values);
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
    studyService = {
      getAll: vi.fn().mockReturnValue(of([radiographyStudy, bloodStudy])),
      getAssociations: vi.fn().mockReturnValue(of([])),
      associate: vi.fn(),
      deactivateAssociation: vi.fn(),
    };
    prescriptionService = {
      getByVisit: vi.fn().mockReturnValue(of([])),
      create: vi.fn(),
      delete: vi.fn(),
    };
    medicationService = {
      getAll: vi.fn().mockReturnValue(of([amoxicillin, meloxicam])),
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
        { provide: StudyService, useValue: studyService },
        { provide: PrescriptionService, useValue: prescriptionService },
        { provide: MedicationService, useValue: medicationService },
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

  it('carga y muestra los estudios activos de la visita', () => {
    configureAccess();
    studyService.getAssociations.mockReturnValue(
      of([
        radiographyAssociation,
        {
          ...radiographyAssociation,
          externalId: 'assoc-inactive',
          study: bloodStudy,
          active: false,
        },
        {
          ...radiographyAssociation,
          externalId: 'assoc-other-visit',
          visit: { ...visit, externalId: 'visit-2' },
        },
      ]),
    );

    createComponent();

    expect(studyService.getAssociations).toHaveBeenCalled();
    expect(element().textContent).toContain('Radiografía');
    expect(element().textContent).not.toContain('Análisis de sangre');
  });

  it('excluye del selector los estudios con asociación inactiva', () => {
    configureAccess({ addStudies: true });
    studyService.getAll.mockReturnValue(
      of([radiographyStudy, bloodStudy, urineStudy]),
    );
    studyService.getAssociations.mockReturnValue(
      of([
        radiographyAssociation,
        {
          ...radiographyAssociation,
          externalId: 'assoc-inactive',
          study: bloodStudy,
          active: false,
        },
      ]),
    );

    createComponent();
    findButtonByText('Agregar estudio')!.click();
    fixture.detectChanges();

    expect(studyOptions()).toContain('Análisis de orina');
    expect(studyOptions()).not.toContain('Radiografía');
    expect(studyOptions()).not.toContain('Análisis de sangre');
  });

  it('al quitar un estudio no vuelve a ofrecerse en el selector', () => {
    configureAccess({ addStudies: true, removeStudies: true });
    studyService.getAssociations.mockReturnValue(of([radiographyAssociation]));
    studyService.deactivateAssociation.mockReturnValue(of(void 0));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    createComponent();

    findButtonByText('Agregar estudio')!.click();
    fixture.detectChanges();

    expect(studyOptions()).toContain('Análisis de sangre');
    expect(studyOptions()).not.toContain('Radiografía');

    findButtonByText('Cancelar')!.click();
    fixture.detectChanges();

    element().querySelector<HTMLButtonElement>('.study-remove-btn')!.click();
    fixture.detectChanges();

    expect(element().textContent).toContain(
      'Esta visita todavía no tiene estudios asociados.',
    );
    expect(
      component
        .studyAssociations()
        .find((association) => association.externalId === 'assoc-radiography')
        ?.active,
    ).toBe(false);

    findButtonByText('Agregar estudio')!.click();
    fixture.detectChanges();

    expect(studyOptions()).not.toContain('Radiografía');
    expect(studyOptions()).toContain('Análisis de sangre');
  });

  it('no consulta ni muestra estudios sin VIEW_CLINICAL_RECORDS', () => {
    configureAccess({ view: false });

    createComponent();

    expect(studyService.getAssociations).not.toHaveBeenCalled();
    expect(element().querySelector('.studies-section')).toBeNull();
  });

  it('muestra la carga y luego el estado vacío de estudios', () => {
    configureAccess();
    const studies$ = new Subject<StudyByVisitResponse[]>();
    studyService.getAssociations.mockReturnValue(studies$);

    createComponent();

    expect(element().textContent).toContain('Cargando estudios...');

    studies$.next([]);
    studies$.complete();
    fixture.detectChanges();

    expect(element().textContent).toContain(
      'Esta visita todavía no tiene estudios asociados.',
    );
  });

  it('muestra el error de carga de estudios y permite reintentar', () => {
    configureAccess();
    studyService.getAssociations.mockReturnValue(
      throwError(() => ({ status: 500 })),
    );

    createComponent();

    expect(element().textContent).toContain(
      'No pudimos cargar los estudios. Intentá nuevamente.',
    );

    const retryButton = findButtonByText('Reintentar');
    expect(retryButton).toBeDefined();

    studyService.getAssociations.mockReturnValue(of([radiographyAssociation]));
    retryButton!.click();
    fixture.detectChanges();

    expect(studyService.getAssociations).toHaveBeenCalledTimes(2);
    expect(element().textContent).toContain('Radiografía');
  });

  it('no ofrece reintentar estudios cuando el error no es recuperable', () => {
    configureAccess();
    studyService.getAssociations.mockReturnValue(
      throwError(() => ({ status: 403 })),
    );

    createComponent();

    expect(element().textContent).toContain(
      'No tenés permisos para ver los estudios.',
    );
    expect(findButtonByText('Reintentar')).toBeUndefined();
  });

  it('solo muestra el alta de estudios con CREATE_CLINICAL_RECORDS', () => {
    configureAccess({ addStudies: false });
    createComponent();

    expect(findButtonByText('Agregar estudio')).toBeUndefined();
  });

  it('asocia un estudio disponible a la visita', () => {
    configureAccess({ addStudies: true });
    studyService.associate.mockReturnValue(of(radiographyAssociation));

    createComponent();
    findButtonByText('Agregar estudio')!.click();
    fixture.detectChanges();

    expect(element().textContent).toContain('Asociar estudio');

    selectStudy('study-radiography');
    findButtonByText('Asociar estudio')!.click();
    fixture.detectChanges();

    expect(studyService.associate).toHaveBeenCalledWith({
      studyExternalId: 'study-radiography',
      visitExternalId: 'visit-1',
      description: 'Resultado',
    });
    expect(element().textContent).toContain('Radiografía');
    expect(component.studyFormVisible()).toBe(false);
  });

  it('no asocia un estudio sin seleccionarlo', () => {
    configureAccess({ addStudies: true });
    createComponent();

    findButtonByText('Agregar estudio')!.click();
    fixture.detectChanges();

    findButtonByText('Asociar estudio')!.click();
    fixture.detectChanges();

    expect(studyService.associate).not.toHaveBeenCalled();
    expect(element().textContent).toContain('Seleccioná un estudio.');
  });

  it('muestra el conflicto al asociar un estudio ya asociado', () => {
    configureAccess({ addStudies: true });
    studyService.associate.mockReturnValue(
      throwError(() => ({ status: 409 })),
    );

    createComponent();
    findButtonByText('Agregar estudio')!.click();
    fixture.detectChanges();

    selectStudy('study-radiography');
    findButtonByText('Asociar estudio')!.click();
    fixture.detectChanges();

    expect(element().textContent).toContain(
      'Este estudio ya está asociado a la visita.',
    );
    expect(component.studyFormVisible()).toBe(true);
  });

  it('solo muestra quitar estudios a administradores', () => {
    configureAccess({ removeStudies: false });
    studyService.getAssociations.mockReturnValue(of([radiographyAssociation]));

    createComponent();

    expect(element().querySelector('.study-remove-btn')).toBeNull();
  });

  it('quita un estudio confirmado', () => {
    configureAccess({ removeStudies: true });
    studyService.getAssociations.mockReturnValue(of([radiographyAssociation]));
    studyService.deactivateAssociation.mockReturnValue(of(void 0));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    createComponent();

    const removeButton = element().querySelector<HTMLButtonElement>(
      '.study-remove-btn',
    );
    expect(removeButton).not.toBeNull();
    removeButton!.click();
    fixture.detectChanges();

    expect(window.confirm).toHaveBeenCalled();
    expect(studyService.deactivateAssociation).toHaveBeenCalledWith(
      'assoc-radiography',
    );
    expect(element().textContent).not.toContain('Radiografía');
    expect(element().textContent).toContain(
      'Esta visita todavía no tiene estudios asociados.',
    );
  });

  it('no permite abrir ni enviar el formulario de estudios mientras carga el listado', () => {
    configureAccess({ addStudies: true });
    const pendingList$ = new Subject<StudyByVisitResponse[]>();
    studyService.getAssociations.mockReturnValue(pendingList$);

    createComponent();

    const addButton = findButtonByText('Agregar estudio');
    expect(addButton?.disabled).toBe(true);

    component.openStudyForm();
    fixture.detectChanges();
    expect(component.studyFormVisible()).toBe(false);

    selectStudy('study-radiography');
    component.submitStudy();
    fixture.detectChanges();

    expect(studyService.associate).not.toHaveBeenCalled();
    expect(component.studyFormError()).toBe(
      'Esperá a que terminen de cargar los estudios.',
    );

    pendingList$.next([]);
    pendingList$.complete();
    fixture.detectChanges();

    expect(component.studiesLoading()).toBe(false);
    expect(findButtonByText('Agregar estudio')?.disabled).toBe(false);
  });

  it('una respuesta pendiente del listado no sobrescribe un estudio recién asociado', () => {
    configureAccess({ addStudies: true });

    createComponent();
    findButtonByText('Agregar estudio')!.click();
    fixture.detectChanges();

    const associate$ = new Subject<StudyByVisitResponse>();
    studyService.associate.mockReturnValue(associate$);

    selectStudy('study-radiography');
    findButtonByText('Asociar estudio')!.click();
    fixture.detectChanges();

    const staleList$ = new Subject<StudyByVisitResponse[]>();
    studyService.getAssociations.mockReturnValue(staleList$);
    component.loadStudies('visit-1');
    fixture.detectChanges();

    expect(component.studiesLoading()).toBe(true);

    associate$.next(radiographyAssociation);
    associate$.complete();
    fixture.detectChanges();

    expect(element().textContent).toContain('Radiografía');
    expect(component.studiesLoading()).toBe(false);

    staleList$.next([
      {
        ...radiographyAssociation,
        externalId: 'assoc-stale',
        study: bloodStudy,
      },
    ]);
    staleList$.complete();
    fixture.detectChanges();

    expect(component.studies().map((item) => item.externalId)).toEqual([
      'assoc-radiography',
    ]);
    expect(element().textContent).not.toContain('Análisis de sangre');
  });

  it('carga y muestra solo las prescripciones activas de la visita', () => {
    configureAccess();
    prescriptionService.getByVisit.mockReturnValue(
      of([
        recentPrescription,
        {
          ...recentPrescription,
          externalId: 'presc-inactive',
          indication: 'Prescripción dada de baja.',
          active: false,
        },
      ]),
    );

    createComponent();

    expect(prescriptionService.getByVisit).toHaveBeenCalledWith('visit-1');
    expect(element().textContent).toContain('Amoxicilina');
    expect(element().textContent).toContain('Cada 12 horas por 7 días.');
    expect(element().textContent).not.toContain('Prescripción dada de baja.');
    expect(
      element().querySelectorAll('.prescription-item').length,
    ).toBe(1);
  });

  it('no consulta ni muestra prescripciones sin VIEW_CLINICAL_RECORDS', () => {
    configureAccess({ view: false });

    createComponent();

    expect(prescriptionService.getByVisit).not.toHaveBeenCalled();
    expect(element().querySelector('.prescriptions-section')).toBeNull();
  });

  it('muestra la carga y luego el estado vacío de prescripciones', () => {
    configureAccess();
    const prescriptions$ = new Subject<PrescriptionResponse[]>();
    prescriptionService.getByVisit.mockReturnValue(prescriptions$);

    createComponent();

    expect(element().textContent).toContain('Cargando prescripciones...');

    prescriptions$.next([]);
    prescriptions$.complete();
    fixture.detectChanges();

    expect(element().textContent).toContain(
      'Esta visita todavía no tiene prescripciones registradas.',
    );
  });

  it('muestra el error de carga de prescripciones y permite reintentar', () => {
    configureAccess();
    prescriptionService.getByVisit.mockReturnValue(
      throwError(() => ({ status: 500 })),
    );

    createComponent();

    expect(element().textContent).toContain(
      'No pudimos cargar las prescripciones. Intentá nuevamente.',
    );

    const retryButton = findButtonByText('Reintentar');
    expect(retryButton).toBeDefined();

    prescriptionService.getByVisit.mockReturnValue(of([recentPrescription]));
    retryButton!.click();
    fixture.detectChanges();

    expect(prescriptionService.getByVisit).toHaveBeenCalledTimes(2);
    expect(element().textContent).toContain('Amoxicilina');
  });

  it('no ofrece reintentar prescripciones cuando el error no es recuperable', () => {
    configureAccess();
    prescriptionService.getByVisit.mockReturnValue(
      throwError(() => ({ status: 403 })),
    );

    createComponent();

    expect(element().textContent).toContain(
      'No tenés permisos para ver las prescripciones.',
    );
    expect(findButtonByText('Reintentar')).toBeUndefined();
  });

  it('solo muestra el alta y la baja de prescripciones a veterinarios', () => {
    configureAccess({ view: true, manage: false });
    prescriptionService.getByVisit.mockReturnValue(of([recentPrescription]));

    createComponent();

    expect(findButtonByText('Agregar prescripción')).toBeUndefined();
    expect(element().querySelector('.prescription-delete-btn')).toBeNull();
    expect(medicationService.getAll).not.toHaveBeenCalled();
  });

  it('registra una prescripción para el diagnóstico de la visita', () => {
    configureAccess({ manage: true });
    diagnosisService.getByVisit.mockReturnValue(of([recentDiagnosis]));
    prescriptionService.create.mockReturnValue(of(recentPrescription));

    createComponent();
    findButtonByText('Agregar prescripción')!.click();
    fixture.detectChanges();

    expect(element().textContent).toContain('Nueva prescripción');

    fillPrescriptionForm({
      quantity: 10,
      indication: '  Cada 12 horas por 7 días.  ',
      expirationDate: '2026-12-10',
      medicationExternalId: 'med-amoxicillin',
      diagnosisExternalId: 'diag-recent',
    });
    findButtonByText('Guardar prescripción')!.click();
    fixture.detectChanges();

    expect(prescriptionService.create).toHaveBeenCalledWith({
      quantity: 10,
      indication: 'Cada 12 horas por 7 días.',
      expirationDate: '2026-12-10',
      medicationExternalId: 'med-amoxicillin',
      diagnosisExternalId: 'diag-recent',
    });
    expect(element().textContent).toContain('Amoxicilina');
    expect(component.prescriptionFormVisible()).toBe(false);
  });

  it('muestra el conflicto al prescribir sobre un diagnóstico de más de un mes', () => {
    configureAccess({ manage: true });
    diagnosisService.getByVisit.mockReturnValue(of([olderDiagnosis]));
    prescriptionService.create.mockReturnValue(
      throwError(() => ({ status: 409 })),
    );

    createComponent();
    findButtonByText('Agregar prescripción')!.click();
    fixture.detectChanges();

    fillPrescriptionForm({
      quantity: 5,
      indication: 'Cada 24 horas.',
      expirationDate: '2026-12-10',
      medicationExternalId: 'med-meloxicam',
      diagnosisExternalId: 'diag-older',
    });
    findButtonByText('Guardar prescripción')!.click();
    fixture.detectChanges();

    expect(element().textContent).toContain(
      'No se puede prescribir: el diagnóstico tiene más de un mes de antigüedad.',
    );
    expect(component.prescriptionFormVisible()).toBe(true);
  });

  it('renderiza prescripciones duplicadas del mismo medicamento', () => {
    configureAccess();
    prescriptionService.getByVisit.mockReturnValue(
      of([
        recentPrescription,
        {
          ...recentPrescription,
          externalId: 'presc-duplicate',
          quantity: 5,
          indication: 'Segunda indicación.',
          expirationDate: '2026-12-20',
        },
      ]),
    );

    createComponent();

    expect(
      element().querySelectorAll('.prescription-item').length,
    ).toBe(2);
    expect(element().textContent).toContain('Segunda indicación.');
  });

  it('da de baja una prescripción confirmada', () => {
    configureAccess({ manage: true });
    prescriptionService.getByVisit.mockReturnValue(of([recentPrescription]));
    prescriptionService.delete.mockReturnValue(of(void 0));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    createComponent();

    const deleteButton = element().querySelector<HTMLButtonElement>(
      '.prescription-delete-btn',
    );
    expect(deleteButton).not.toBeNull();
    deleteButton!.click();
    fixture.detectChanges();

    expect(window.confirm).toHaveBeenCalled();
    expect(prescriptionService.delete).toHaveBeenCalledWith('presc-recent');
    expect(element().textContent).not.toContain('Amoxicilina');
    expect(element().textContent).toContain(
      'Esta visita todavía no tiene prescripciones registradas.',
    );
  });

  it('no permite abrir ni enviar el formulario de prescripciones mientras carga el listado', () => {
    configureAccess({ manage: true });
    diagnosisService.getByVisit.mockReturnValue(of([recentDiagnosis]));
    const pendingList$ = new Subject<PrescriptionResponse[]>();
    prescriptionService.getByVisit.mockReturnValue(pendingList$);

    createComponent();

    const addButton = findButtonByText('Agregar prescripción');
    expect(addButton?.disabled).toBe(true);

    component.openPrescriptionForm();
    fixture.detectChanges();
    expect(component.prescriptionFormVisible()).toBe(false);

    fillPrescriptionForm({
      quantity: 10,
      indication: 'Cada 12 horas.',
      expirationDate: '2026-12-10',
      medicationExternalId: 'med-amoxicillin',
      diagnosisExternalId: 'diag-recent',
    });
    component.submitPrescription();
    fixture.detectChanges();

    expect(prescriptionService.create).not.toHaveBeenCalled();
    expect(component.prescriptionFormError()).toBe(
      'Esperá a que terminen de cargar las prescripciones.',
    );

    pendingList$.next([]);
    pendingList$.complete();
    fixture.detectChanges();

    expect(component.prescriptionsLoading()).toBe(false);
    expect(findButtonByText('Agregar prescripción')?.disabled).toBe(false);
  });

  it('una respuesta pendiente del listado no sobrescribe una prescripción recién creada', () => {
    configureAccess({ manage: true });
    diagnosisService.getByVisit.mockReturnValue(of([recentDiagnosis]));

    createComponent();
    findButtonByText('Agregar prescripción')!.click();
    fixture.detectChanges();

    const create$ = new Subject<PrescriptionResponse>();
    prescriptionService.create.mockReturnValue(create$);

    fillPrescriptionForm({
      quantity: 10,
      indication: 'Cada 12 horas por 7 días.',
      expirationDate: '2026-12-10',
      medicationExternalId: 'med-amoxicillin',
      diagnosisExternalId: 'diag-recent',
    });
    findButtonByText('Guardar prescripción')!.click();
    fixture.detectChanges();

    const staleList$ = new Subject<PrescriptionResponse[]>();
    prescriptionService.getByVisit.mockReturnValue(staleList$);
    component.loadPrescriptions('visit-1');
    fixture.detectChanges();

    expect(component.prescriptionsLoading()).toBe(true);

    create$.next(recentPrescription);
    create$.complete();
    fixture.detectChanges();

    expect(element().textContent).toContain('Amoxicilina');
    expect(component.prescriptionsLoading()).toBe(false);

    staleList$.next([
      {
        ...recentPrescription,
        externalId: 'presc-stale',
        medication: meloxicam,
        indication: 'Prescripción obsoleta.',
      },
    ]);
    staleList$.complete();
    fixture.detectChanges();

    expect(
      component.prescriptions().map((item) => item.externalId),
    ).toEqual(['presc-recent']);
    expect(element().textContent).not.toContain('Meloxicam');
  });
});
