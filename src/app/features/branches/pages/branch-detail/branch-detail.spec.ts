import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { BranchService } from '../../services/branch';
import { BranchDetail } from './branch-detail';

describe('BranchDetail', () => {
  let fixture: ComponentFixture<BranchDetail>;
  let component: BranchDetail;
  let service: {
    getById: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let auth: { hasAnyRole: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

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
    fixture = TestBed.createComponent(BranchDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    service = {
      getById: vi.fn(),
      delete: vi.fn(),
    };
    auth = {
      hasAnyRole: vi.fn().mockReturnValue(false),
    };
    router = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    const route = {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === 'externalId' ? 'branch-1' : null),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [BranchDetail],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: BranchService, useValue: service },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carga y muestra los datos de la sucursal', () => {
    service.getById.mockReturnValue(of(branch));

    createComponent();

    expect(component.branch()).toEqual(branch);
    expect(fixture.nativeElement.textContent).toContain('Sucursal Centro');
    expect(fixture.nativeElement.textContent).toContain('centro@veterinaria.com');
    expect(fixture.nativeElement.textContent).toContain('08:00 - 18:00');
    expect(fixture.nativeElement.textContent).toContain('Av. Siempre Viva');
    expect(fixture.nativeElement.textContent).toContain('742');
  });

  it('muestra el estado no encontrado', () => {
    service.getById.mockReturnValue(throwError(() => ({ status: 404 })));

    createComponent();

    expect(component.notFound()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No encontramos la sucursal solicitada.',
    );
  });

  it('muestra las acciones de administración solo para administradores', () => {
    auth.hasAnyRole.mockReturnValue(true);
    service.getById.mockReturnValue(of(branch));

    createComponent();

    expect(fixture.nativeElement.textContent).toContain('Editar');
    expect(fixture.nativeElement.textContent).toContain('Eliminar');
  });

  it('elimina la sucursal y vuelve al listado', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    auth.hasAnyRole.mockReturnValue(true);
    service.getById.mockReturnValue(of(branch));
    service.delete.mockReturnValue(of(undefined));

    createComponent();
    component.deleteBranch();

    expect(service.delete).toHaveBeenCalledWith('branch-1');
    expect(router.navigate).toHaveBeenCalledWith(['/branches']);
  });

  it('muestra el error cuando falla la eliminación', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    auth.hasAnyRole.mockReturnValue(true);
    service.getById.mockReturnValue(of(branch));
    service.delete.mockReturnValue(throwError(() => ({ status: 403 })));

    createComponent();
    component.deleteBranch();

    expect(component.deleteError()).toBe('No tenés permisos para eliminar sucursales.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
