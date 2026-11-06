import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AnimalTypeService } from '../../services/animal-type';
import { AnimalTypeForm } from './animal-type-form';

const CREATE_ERROR_CASES = [
  { status: 400, message: 'Datos inválidos. Revisá el campo.' },
  {
    status: 403,
    message: 'No tenés permisos para crear tipos de animales.',
  },
  {
    status: 500,
    message:
      'No pudimos crear el tipo de animal. Intentá nuevamente en unos minutos.',
  },
];

describe('AnimalTypeForm', () => {
  let fixture: ComponentFixture<AnimalTypeForm>;
  let component: AnimalTypeForm;
  let service: {
    getById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let params: Record<string, string>;

  function createComponent(): void {
    fixture = TestBed.createComponent(AnimalTypeForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function submitName(name: string): void {
    component.animalTypeForm.setValue({ name });
    component.onSubmit();
  }

  beforeEach(async () => {
    params = {};
    service = {
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
    router = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    const route = {
      snapshot: {
        paramMap: {
          get: (key: string) => params[key] ?? null,
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [AnimalTypeForm],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: AnimalTypeService, useValue: service },
      ],
    }).compileComponents();
  });

  it('valida que el nombre sea obligatorio, no vacío y de máximo 50 caracteres', () => {
    createComponent();
    const nameControl = component.animalTypeForm.get('name');

    nameControl?.setValue('');
    expect(nameControl?.hasError('required')).toBe(true);

    nameControl?.setValue('   ');
    expect(nameControl?.hasError('pattern')).toBe(true);

    nameControl?.setValue('a'.repeat(51));
    expect(nameControl?.hasError('maxlength')).toBe(true);

    component.onSubmit();

    expect(service.create).not.toHaveBeenCalled();
    expect(nameControl?.touched).toBe(true);
  });

  it('crea un tipo de animal con el nombre recortado y vuelve al listado', () => {
    service.create.mockReturnValue(
      of({ externalId: 'animal-type-1', name: 'Perro' }),
    );
    createComponent();

    submitName('  Perro  ');

    expect(service.create).toHaveBeenCalledWith({ name: 'Perro' });
    expect(router.navigate).toHaveBeenCalledWith(['/animal-types']);
  });

  it('carga el registro en modo edición y actualiza con el nombre recortado', () => {
    params['externalId'] = 'animal-type-1';
    service.getById.mockReturnValue(
      of({ externalId: 'animal-type-1', name: 'Gato' }),
    );
    service.update.mockReturnValue(
      of({ externalId: 'animal-type-1', name: 'Gato' }),
    );

    createComponent();

    expect(service.getById).toHaveBeenCalledWith('animal-type-1');
    expect(component.editando()).toBe(true);
    expect(component.animalTypeForm.get('name')?.value).toBe('Gato');

    submitName('  Gato  ');

    expect(service.update).toHaveBeenCalledWith('animal-type-1', {
      name: 'Gato',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/animal-types']);
  });

  it('muestra el estado de carga al editar', () => {
    params['externalId'] = 'animal-type-1';
    const request = new Subject<{ externalId: string; name: string }>();
    service.getById.mockReturnValue(request.asObservable());

    createComponent();

    expect(component.loading()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Cargando tipo de animal...',
    );

    request.next({ externalId: 'animal-type-1', name: 'Gato' });
    request.complete();
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.animalTypeForm.get('name')?.value).toBe('Gato');
  });

  it('muestra el estado no encontrado al cargar en edición', () => {
    params['externalId'] = 'animal-type-1';
    service.getById.mockReturnValue(throwError(() => ({ status: 404 })));

    createComponent();

    expect(component.notFound()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No encontramos el tipo de animal solicitado.',
    );
  });

  it('permite reintentar la carga cuando el error es reintentable', () => {
    params['externalId'] = 'animal-type-1';
    service.getById
      .mockReturnValueOnce(throwError(() => ({ status: 500 })))
      .mockReturnValueOnce(
        of({ externalId: 'animal-type-1', name: 'Gato' }),
      );

    createComponent();

    expect(component.loadErrorRetryable()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No pudimos cargar los datos del tipo de animal. Intentá nuevamente en unos minutos.',
    );

    component.retryLoad();
    fixture.detectChanges();

    expect(service.getById).toHaveBeenCalledTimes(2);
    expect(component.loadError()).toBeNull();
    expect(component.animalTypeForm.get('name')?.value).toBe('Gato');
  });

  it.each(CREATE_ERROR_CASES)(
    'muestra el error de creación $status y habilita el formulario',
    ({ status, message }) => {
      service.create.mockReturnValue(throwError(() => ({ status })));
      createComponent();

      submitName('Perro');

      expect(component.error()).toBe(message);
      expect(component.saving()).toBe(false);
      expect(component.animalTypeForm.enabled).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    },
  );

  it('muestra el error de actualización y no navega', () => {
    params['externalId'] = 'animal-type-1';
    service.getById.mockReturnValue(
      of({ externalId: 'animal-type-1', name: 'Gato' }),
    );
    service.update.mockReturnValue(throwError(() => ({ status: 403 })));

    createComponent();
    submitName('Gato');

    expect(component.error()).toBe(
      'No tenés permisos para actualizar tipos de animales.',
    );
    expect(component.animalTypeForm.enabled).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
