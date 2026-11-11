import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { PetResponse } from '../../../pets/models/pet.model';
import { PetService } from '../../../pets/services/pet';
import { VeterinarianResponse } from '../../../veterinarians/models/veterinarian.model';
import { VeterinarianService } from '../../../veterinarians/services/veterinarian';
import { AppointmentResponse } from '../../models/appointment.model';
import { AppointmentService } from '../../services/appointment';
import { AppointmentList } from './appointment-list';

describe('AppointmentList', () => {
  let fixture: ComponentFixture<AppointmentList>;
  let component: AppointmentList;
  let appointmentService: { getAll: ReturnType<typeof vi.fn> };
  let petService: {
    getAll: ReturnType<typeof vi.fn>;
    getMyPets: ReturnType<typeof vi.fn>;
  };
  let veterinarianService: { getAll: ReturnType<typeof vi.fn> };
  let authService: { hasRole: ReturnType<typeof vi.fn> };

  const veterinarian: VeterinarianResponse = {
    externalId: 'vet-1',
    firstName: 'Juan',
    lastName: 'Pérez',
    licenseNumber: 'MN-1234',
    phone: '11 5555-6789',
    email: 'jperez@veterinaria.com',
    workStartTime: '08:00:00',
    workEndTime: '16:00:00',
    workDays: ['MONDAY', 'WEDNESDAY'],
    active: true,
    branch: null,
  };

  const pet: PetResponse = {
    externalId: 'pet-1',
    name: 'Firulais',
    birthDate: '2020-05-05',
    active: true,
    color: 'Marrón',
    animalType: { externalId: 'animal-type-1', name: 'Perro' },
    breed: { externalId: 'breed-1', name: 'Labrador' },
    visitsCount: 2,
    lastVisitDate: '2026-01-15',
    activeAppointments: 1,
  };

  const baseAppointment: AppointmentResponse = {
    externalId: 'appointment-1',
    appointmentDate: '2026-11-11T14:30:00',
    durationMinutes: 30,
    reason: 'Consulta general',
    status: 'PENDING',
    pet,
    veterinarian,
    branch: {
      externalId: 'branch-1',
      name: 'Sucursal Centro',
      phone: '11 5555-1234',
      email: 'centro@veterinaria.com',
      openingTime: '08:00:00',
      closingTime: '18:00:00',
      address: null,
    },
  };

  const emptyFilters = {
    dateFrom: '',
    dateTo: '',
    status: '',
    petExternalId: '',
    veterinarianExternalId: '',
    reason: '',
  };

  function appointment(
    overrides: Partial<AppointmentResponse> = {},
  ): AppointmentResponse {
    return { ...baseAppointment, ...overrides };
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(AppointmentList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    appointmentService = { getAll: vi.fn() };
    petService = {
      getAll: vi.fn().mockReturnValue(of([])),
      getMyPets: vi.fn().mockReturnValue(of([])),
    };
    veterinarianService = { getAll: vi.fn().mockReturnValue(of([])) };
    authService = { hasRole: vi.fn().mockReturnValue(false) };

    await TestBed.configureTestingModule({
      imports: [AppointmentList],
      providers: [
        { provide: AppointmentService, useValue: appointmentService },
        { provide: PetService, useValue: petService },
        { provide: VeterinarianService, useValue: veterinarianService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carga los turnos al iniciar con los filtros vacíos', () => {
    appointmentService.getAll.mockReturnValue(of([appointment()]));

    createComponent();

    expect(appointmentService.getAll).toHaveBeenCalledTimes(1);
    expect(appointmentService.getAll).toHaveBeenCalledWith(emptyFilters);
    expect(component.appointments()).toEqual([appointment()]);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.appliedFilters()).toBe(false);
  });

  it('renderiza varias filas con los datos de cada turno', () => {
    appointmentService.getAll.mockReturnValue(
      of([
        appointment({ externalId: 'appointment-1' }),
        appointment({
          externalId: 'appointment-2',
          reason: 'Vacunación',
          pet: { ...pet, name: 'Michi' },
        }),
        appointment({ externalId: 'appointment-3' }),
      ]),
    );

    createComponent();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Firulais');
    expect(text).toContain('Michi');
    expect(text).toContain('Juan Pérez');
    expect(text).toContain('Sucursal Centro');
    expect(text).toContain('Consulta general');
    expect(text).toContain('Vacunación');
  });

  it('muestra la etiqueta y la clase de badge para cada estado', () => {
    appointmentService.getAll.mockReturnValue(
      of([
        appointment({ externalId: 'a-1', status: 'PENDING' }),
        appointment({ externalId: 'a-2', status: 'CONFIRMED' }),
        appointment({ externalId: 'a-3', status: 'COMPLETED' }),
        appointment({ externalId: 'a-4', status: 'CANCELLED' }),
      ]),
    );

    createComponent();

    const pending = fixture.nativeElement.querySelector(
      '.status-badge.is-pending',
    );
    const confirmed = fixture.nativeElement.querySelector(
      '.status-badge.is-confirmed',
    );
    const completed = fixture.nativeElement.querySelector(
      '.status-badge.is-completed',
    );
    const cancelled = fixture.nativeElement.querySelector(
      '.status-badge.is-cancelled',
    );

    expect(pending?.textContent?.trim()).toBe('Pendiente');
    expect(confirmed?.textContent?.trim()).toBe('Confirmado');
    expect(completed?.textContent?.trim()).toBe('Completado');
    expect(cancelled?.textContent?.trim()).toBe('Cancelado');
  });

  it('formatea la fecha y la hora tal como las recibe del backend', () => {
    expect(component.formatAppointmentDate('2026-11-11T14:30:00')).toBe(
      '11/11/2026, 14:30',
    );
    expect(component.formatAppointmentDate('2026-01-05T09:05:00')).toBe(
      '05/01/2026, 09:05',
    );
    expect(component.formatAppointmentDate('2026-12-01T00:00:00')).toBe(
      '01/12/2026, 00:00',
    );
  });

  it('muestra la fecha formateada y la duración en cada fila', () => {
    appointmentService.getAll.mockReturnValue(of([appointment()]));

    createComponent();

    const cell = fixture.nativeElement.querySelector('.appointment-datetime');
    expect(cell?.textContent).toContain('11/11/2026, 14:30');
    expect(cell?.textContent).toContain('30 min');
  });

  it('devuelve el valor crudo si la fecha no tiene el formato esperado', () => {
    expect(component.formatAppointmentDate('mañana')).toBe('mañana');
    expect(component.formatAppointmentDate('')).toBe('');
  });

  it('muestra un texto alternativo cuando las relaciones son nulas', () => {
    appointmentService.getAll.mockReturnValue(
      of([appointment({ pet: null, veterinarian: null, branch: null })]),
    );

    createComponent();

    const row = fixture.nativeElement.querySelector('tbody tr');
    const cells = row.querySelectorAll('td');
    expect(cells[1].textContent?.trim()).toBe('No disponible');
    expect(cells[2].textContent?.trim()).toBe('No disponible');
    expect(cells[3].textContent?.trim()).toBe('No disponible');
  });

  it('muestra el estado vacío cuando no hay turnos', () => {
    appointmentService.getAll.mockReturnValue(of([]));

    createComponent();

    expect(fixture.nativeElement.textContent).toContain(
      'No hay turnos registrados.',
    );
  });

  it('muestra el estado de carga hasta que llega la respuesta', () => {
    const appointments$ = new Subject<AppointmentResponse[]>();
    appointmentService.getAll.mockReturnValue(appointments$);

    createComponent();

    expect(fixture.nativeElement.textContent).toContain('Cargando turnos...');

    appointments$.next([appointment()]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain(
      'Cargando turnos...',
    );
    expect(fixture.nativeElement.textContent).toContain('Firulais');
  });

  it('muestra el error de permisos sin botón de reintento', () => {
    appointmentService.getAll.mockReturnValue(
      throwError(() => ({ status: 403 })),
    );

    createComponent();

    expect(component.error()).toBe('No tenés permisos para ver los turnos.');
    expect(fixture.nativeElement.textContent).toContain(
      'No tenés permisos para ver los turnos.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('Reintentar');
  });

  it('muestra el botón de reintento para errores reintentables', () => {
    appointmentService.getAll.mockReturnValue(
      throwError(() => ({ status: 0 })),
    );

    createComponent();

    expect(component.loadErrorRetryable()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });

  it('reintenta la carga al presionar Reintentar', () => {
    appointmentService.getAll
      .mockReturnValueOnce(throwError(() => ({ status: 500 })))
      .mockReturnValue(of([appointment()]));

    createComponent();

    const retryButton = fixture.nativeElement.querySelector(
      '.state-actions button',
    );
    retryButton.click();
    fixture.detectChanges();

    expect(appointmentService.getAll).toHaveBeenCalledTimes(2);
    expect(component.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Firulais');
  });

  it('carga las mascotas y los veterinarios al iniciar para roles internos', () => {
    appointmentService.getAll.mockReturnValue(of([]));
    petService.getAll.mockReturnValue(of([pet]));
    veterinarianService.getAll.mockReturnValue(of([veterinarian]));

    createComponent();

    expect(petService.getAll).toHaveBeenCalledTimes(1);
    expect(petService.getMyPets).not.toHaveBeenCalled();
    expect(veterinarianService.getAll).toHaveBeenCalledTimes(1);
    expect(component.pets()).toEqual([pet]);
    expect(component.veterinarians()).toEqual([veterinarian]);
  });

  it('carga las mascotas del cliente con getMyPets para ROLE_CLIENT', () => {
    authService.hasRole.mockReturnValue(true);
    appointmentService.getAll.mockReturnValue(of([]));
    petService.getMyPets.mockReturnValue(of([pet]));
    veterinarianService.getAll.mockReturnValue(of([veterinarian]));

    createComponent();

    expect(petService.getMyPets).toHaveBeenCalledTimes(1);
    expect(petService.getAll).not.toHaveBeenCalled();
    expect(veterinarianService.getAll).toHaveBeenCalledTimes(1);
    expect(component.pets()).toEqual([pet]);
  });

  it('incluye mascotas y veterinarios inactivos en los selectores', () => {
    appointmentService.getAll.mockReturnValue(of([]));
    petService.getAll.mockReturnValue(
      of([pet, { ...pet, externalId: 'pet-2', name: 'Rex', active: false }]),
    );
    veterinarianService.getAll.mockReturnValue(
      of([
        veterinarian,
        {
          ...veterinarian,
          externalId: 'vet-2',
          firstName: 'Ana',
          lastName: 'Gómez',
          active: false,
        },
      ]),
    );

    createComponent();

    const petOptions = fixture.nativeElement.querySelectorAll(
      '#filter-pet option',
    );
    const veterinarianOptions = fixture.nativeElement.querySelectorAll(
      '#filter-veterinarian option',
    );

    expect(petOptions.length).toBe(3);
    expect(
      fixture.nativeElement.querySelector('#filter-pet option[value="pet-2"]'),
    ).not.toBeNull();
    expect(veterinarianOptions.length).toBe(3);
    expect(
      fixture.nativeElement.querySelector(
        '#filter-veterinarian option[value="vet-2"]',
      ),
    ).not.toBeNull();
  });

  it('desambigua las mascotas con tipo y raza cuando están disponibles', () => {
    appointmentService.getAll.mockReturnValue(of([]));
    petService.getAll.mockReturnValue(of([pet]));

    createComponent();

    const petOption = fixture.nativeElement.querySelector(
      '#filter-pet option[value="pet-1"]',
    );
    expect(petOption?.textContent?.trim()).toBe('Firulais (Perro - Labrador)');
  });

  it('muestra el nombre de la mascota sin detalles cuando faltan tipo y raza', () => {
    appointmentService.getAll.mockReturnValue(of([]));
    petService.getAll.mockReturnValue(
      of([{ ...pet, animalType: null, breed: null } as unknown as PetResponse]),
    );

    createComponent();

    const petOption = fixture.nativeElement.querySelector(
      '#filter-pet option[value="pet-1"]',
    );
    expect(petOption?.textContent?.trim()).toBe('Firulais');
  });

  it('desambigua los veterinarios con la matrícula cuando está disponible', () => {
    appointmentService.getAll.mockReturnValue(of([]));
    veterinarianService.getAll.mockReturnValue(
      of([veterinarian, { ...veterinarian, externalId: 'vet-2', licenseNumber: '' }]),
    );

    createComponent();

    const labeled = fixture.nativeElement.querySelector(
      '#filter-veterinarian option[value="vet-1"]',
    );
    const unlabeled = fixture.nativeElement.querySelector(
      '#filter-veterinarian option[value="vet-2"]',
    );
    expect(labeled?.textContent?.trim()).toBe('Juan Pérez (MN-1234)');
    expect(unlabeled?.textContent?.trim()).toBe('Juan Pérez');
  });

  it('aplica todos los filtros al buscar', () => {
    appointmentService.getAll.mockReturnValue(of([]));

    createComponent();

    component.filtersForm.setValue({
      dateFrom: '2026-11-01',
      dateTo: '2026-11-30',
      status: 'PENDING',
      petExternalId: 'pet-1',
      veterinarianExternalId: 'vet-1',
      reason: 'Consulta',
    });
    component.loadAppointments();
    fixture.detectChanges();

    expect(appointmentService.getAll).toHaveBeenLastCalledWith({
      dateFrom: '2026-11-01',
      dateTo: '2026-11-30',
      status: 'PENDING',
      petExternalId: 'pet-1',
      veterinarianExternalId: 'vet-1',
      reason: 'Consulta',
    });
    expect(component.appliedFilters()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No encontramos turnos con los filtros aplicados.',
    );
  });

  it('bloquea la búsqueda cuando el rango de fechas es inválido', () => {
    appointmentService.getAll.mockReturnValue(of([]));

    createComponent();

    component.filtersForm.setValue({
      ...emptyFilters,
      dateFrom: '2026-11-30',
      dateTo: '2026-11-01',
    });
    component.loadAppointments();
    fixture.detectChanges();

    expect(appointmentService.getAll).toHaveBeenCalledTimes(1);
    expect(component.filtersError()).toBe(
      'La fecha inicial debe ser anterior o igual a la fecha final.',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'La fecha inicial debe ser anterior o igual a la fecha final.',
    );

    component.filtersForm.setValue({
      ...emptyFilters,
      dateFrom: '2026-11-01',
      dateTo: '2026-11-30',
    });
    component.loadAppointments();
    fixture.detectChanges();

    expect(component.filtersError()).toBeNull();
    expect(appointmentService.getAll).toHaveBeenCalledTimes(2);
  });

  it('limpia los filtros y vuelve a consultar sin filtros', () => {
    appointmentService.getAll.mockReturnValue(of([]));

    createComponent();

    component.filtersForm.setValue({
      dateFrom: '2026-11-01',
      dateTo: '2026-11-30',
      status: 'PENDING',
      petExternalId: 'pet-1',
      veterinarianExternalId: 'vet-1',
      reason: 'Consulta',
    });
    appointmentService.getAll.mockClear();
    component.clearFilters();
    fixture.detectChanges();

    expect(component.filtersForm.getRawValue()).toEqual(emptyFilters);
    expect(appointmentService.getAll).toHaveBeenLastCalledWith(emptyFilters);
    expect(component.appliedFilters()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(
      'No hay turnos registrados.',
    );
  });

  it('no bloquea el listado si falla la carga de mascotas', () => {
    appointmentService.getAll.mockReturnValue(of([appointment()]));
    petService.getAll.mockReturnValue(throwError(() => ({ status: 500 })));

    createComponent();

    expect(component.petsLoadError()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No pudimos cargar las mascotas para el filtro.',
    );
    expect(component.appointments()).toEqual([appointment()]);
  });

  it('no bloquea el listado si falla la carga de veterinarios', () => {
    appointmentService.getAll.mockReturnValue(of([appointment()]));
    veterinarianService.getAll.mockReturnValue(
      throwError(() => ({ status: 500 })),
    );

    createComponent();

    expect(component.veterinariansLoadError()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No pudimos cargar los veterinarios para el filtro.',
    );
    expect(component.appointments()).toEqual([appointment()]);
  });
});
