import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BranchService } from '../../services/branch';
import { BranchForm } from './branch-form';

describe('BranchForm', () => {
  let fixture: ComponentFixture<BranchForm>;
  let component: BranchForm;
  let service: {
    getById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let params: Record<string, string>;

  const branch = {
    externalId: 'branch-1',
    name: 'Sucursal Centro',
    phone: '11 5555-1234',
    email: 'centro@veterinaria.com',
    openingTime: '08:00:00',
    closingTime: '18:00:00',
    address: {
      id: 1,
      street: 'Av. Siempre Viva',
      number: '742',
      city: 'Springfield',
      province: 'Buenos Aires',
      country: 'Argentina',
    },
  };

  function createComponent(): void {
    fixture = TestBed.createComponent(BranchForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function fillForm(): void {
    component.branchForm.setValue({
      name: '  Sucursal Centro  ',
      phone: '  11 5555-1234  ',
      email: 'centro@veterinaria.com',
      openingTime: '08:00',
      closingTime: '18:00',
      address: {
        street: '  Av. Siempre Viva  ',
        number: '  742  ',
        city: '  Springfield  ',
        province: '  Buenos Aires  ',
        country: '  Argentina  ',
      },
    });
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
      imports: [BranchForm],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: BranchService, useValue: service },
      ],
    }).compileComponents();
  });

  it('valida los campos obligatorios de la sucursal y su dirección', () => {
    createComponent();

    component.onSubmit();

    expect(component.branchForm.invalid).toBe(true);
    expect(service.create).not.toHaveBeenCalled();
    expect(component.branchForm.get('name')?.touched).toBe(true);
    expect(component.addressGroup.get('street')?.touched).toBe(true);
  });

  it('crea una sucursal con los datos recortados y vuelve al listado', () => {
    service.create.mockReturnValue(of(branch));
    createComponent();
    fillForm();

    component.onSubmit();

    expect(service.create).toHaveBeenCalledWith({
      name: 'Sucursal Centro',
      phone: '11 5555-1234',
      email: 'centro@veterinaria.com',
      openingTime: '08:00',
      closingTime: '18:00',
      address: {
        street: 'Av. Siempre Viva',
        number: '742',
        city: 'Springfield',
        province: 'Buenos Aires',
        country: 'Argentina',
      },
    });
    expect(router.navigate).toHaveBeenCalledWith(['/branches']);
  });

  it('carga la sucursal en modo edición y actualiza los datos', () => {
    params['externalId'] = 'branch-1';
    service.getById.mockReturnValue(of(branch));
    service.update.mockReturnValue(of(branch));

    createComponent();

    expect(component.editando()).toBe(true);
    expect(component.branchForm.get('name')?.value).toBe('Sucursal Centro');
    expect(component.branchForm.get('openingTime')?.value).toBe('08:00');

    component.onSubmit();

    expect(service.update).toHaveBeenCalledWith(
      'branch-1',
      expect.objectContaining({ name: 'Sucursal Centro', openingTime: '08:00' }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/branches']);
  });

  it('muestra el estado no encontrado al cargar en edición', () => {
    params['externalId'] = 'branch-1';
    service.getById.mockReturnValue(throwError(() => ({ status: 404 })));

    createComponent();

    expect(component.notFound()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No encontramos la sucursal solicitada.',
    );
  });

  it('muestra el error de duplicado al crear', () => {
    service.create.mockReturnValue(throwError(() => ({ status: 409 })));
    createComponent();
    fillForm();

    component.onSubmit();

    expect(component.error()).toBe(
      'Ya existe una sucursal con ese nombre, teléfono o email.',
    );
    expect(component.branchForm.enabled).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('muestra el error de permisos al actualizar', () => {
    params['externalId'] = 'branch-1';
    service.getById.mockReturnValue(of(branch));
    service.update.mockReturnValue(throwError(() => ({ status: 403 })));

    createComponent();
    component.onSubmit();

    expect(component.error()).toBe('No tenés permisos para actualizar sucursales.');
    expect(component.branchForm.enabled).toBe(true);
  });
});
