import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { AnimalTypeResponse } from '../../models/animal-type.model';
import { AnimalTypeService } from '../../services/animal-type';
import { AnimalTypeList } from './animal-type-list';

describe('AnimalTypeList', () => {
  let fixture: ComponentFixture<AnimalTypeList>;
  let component: AnimalTypeList;
  let service: {
    getAll: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let authService: { hasAnyRole: ReturnType<typeof vi.fn> };

  const animalTypes: AnimalTypeResponse[] = [
    { externalId: 'animal-type-1', name: 'Perro' },
    { externalId: 'animal-type-2', name: 'Gato' },
  ];

  function createComponent(): void {
    fixture = TestBed.createComponent(AnimalTypeList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    service = {
      getAll: vi.fn(),
      delete: vi.fn(),
    };
    authService = {
      hasAnyRole: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [AnimalTypeList],
      providers: [
        provideRouter([]),
        { provide: AnimalTypeService, useValue: service },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el estado de carga y luego los tipos de animales', () => {
    const request = new Subject<AnimalTypeResponse[]>();
    service.getAll.mockReturnValue(request.asObservable());

    createComponent();

    expect(component.loading()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Cargando tipos de animales...',
    );

    request.next(animalTypes);
    request.complete();
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Perro');
    expect(fixture.nativeElement.textContent).toContain('Gato');
  });

  it('muestra el error de carga y permite reintentar', () => {
    service.getAll
      .mockReturnValueOnce(throwError(() => ({ status: 500 })))
      .mockReturnValueOnce(of(animalTypes));

    createComponent();

    expect(component.loadErrorRetryable()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No pudimos cargar los tipos de animales. Intentá nuevamente en unos minutos.',
    );

    component.retryLoad();
    fixture.detectChanges();

    expect(service.getAll).toHaveBeenCalledTimes(2);
    expect(component.error()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Perro');
  });

  it('muestra el estado vacío cuando no hay tipos de animales', () => {
    service.getAll.mockReturnValue(of([]));

    createComponent();

    expect(component.animalTypes()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain(
      'No hay tipos de animales registrados.',
    );
  });

  it('elimina un tipo de animal después de confirmar', () => {
    service.getAll.mockReturnValue(of(animalTypes));
    service.delete.mockReturnValue(of(undefined));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    createComponent();
    component.deleteAnimalType(animalTypes[0]);
    fixture.detectChanges();

    expect(window.confirm).toHaveBeenCalled();
    expect(service.delete).toHaveBeenCalledWith('animal-type-1');
    expect(component.animalTypes()).toEqual([animalTypes[1]]);
    expect(fixture.nativeElement.textContent).not.toContain('Perro');
  });

  it('no elimina el registro cuando falla el borrado', () => {
    service.getAll.mockReturnValue(of(animalTypes));
    service.delete.mockReturnValue(throwError(() => ({ status: 500 })));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    createComponent();
    component.deleteAnimalType(animalTypes[0]);
    fixture.detectChanges();

    expect(component.animalTypes()).toEqual(animalTypes);
    expect(fixture.nativeElement.textContent).toContain('Perro');
    expect(fixture.nativeElement.textContent).toContain(
      'No pudimos eliminar el tipo de animal. Intentá nuevamente.',
    );
  });

  it('oculta las acciones administrativas a usuarios no administradores', () => {
    authService.hasAnyRole.mockReturnValue(false);
    service.getAll.mockReturnValue(of(animalTypes));

    createComponent();

    expect(fixture.nativeElement.querySelector('a.btn-primary')).toBeNull();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Acciones');
    expect(fixture.nativeElement.textContent).toContain('Perro');
  });
});
