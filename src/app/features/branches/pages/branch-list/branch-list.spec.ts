import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { BranchResponse } from '../../models/branch.model';
import { BranchService } from '../../services/branch';
import { BranchList } from './branch-list';

describe('BranchList', () => {
  let fixture: ComponentFixture<BranchList>;
  let component: BranchList;
  let service: {
    getAll: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let auth: { hasAnyRole: ReturnType<typeof vi.fn> };

  const branches: BranchResponse[] = [
    {
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
    },
    {
      externalId: 'branch-2',
      name: 'Sucursal Norte',
      phone: '11 5555-5678',
      email: 'norte@veterinaria.com',
      openingTime: '09:30:00',
      closingTime: '17:00:00',
      address: {
        id: 2,
        street: 'Calle Falsa',
        number: '123',
        city: 'Shelbyville',
        province: 'Buenos Aires',
        country: 'Argentina',
      },
    },
  ];

  function createComponent(): void {
    fixture = TestBed.createComponent(BranchList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    service = {
      getAll: vi.fn(),
      delete: vi.fn(),
    };
    auth = {
      hasAnyRole: vi.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [BranchList],
      providers: [
        provideRouter([]),
        { provide: BranchService, useValue: service },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el estado de carga y luego las sucursales', () => {
    const request = new Subject<BranchResponse[]>();
    service.getAll.mockReturnValue(request.asObservable());

    createComponent();

    expect(component.loading()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Cargando sucursales...');

    request.next(branches);
    request.complete();
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Sucursal Centro');
    expect(fixture.nativeElement.textContent).toContain(
      'Av. Siempre Viva 742, Springfield, Buenos Aires',
    );
    expect(fixture.nativeElement.textContent).toContain('08:00 - 18:00');
  });

  it('muestra el error de carga y permite reintentar', () => {
    service.getAll
      .mockReturnValueOnce(throwError(() => ({ status: 500 })))
      .mockReturnValueOnce(of(branches));

    createComponent();

    expect(component.loadErrorRetryable()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No pudimos cargar las sucursales. Intentá nuevamente en unos minutos.',
    );

    component.retryLoad();
    fixture.detectChanges();

    expect(service.getAll).toHaveBeenCalledTimes(2);
    expect(component.error()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Sucursal Centro');
  });

  it('muestra el estado vacío cuando no hay sucursales', () => {
    service.getAll.mockReturnValue(of([]));

    createComponent();

    expect(component.branches()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No hay sucursales registradas.');
  });

  it('selecciona una sucursal y la identifica visualmente', () => {
    service.getAll.mockReturnValue(of(branches));

    createComponent();
    component.selectBranch(branches[0]);
    fixture.detectChanges();

    expect(component.selectedBranchId()).toBe('branch-1');
    expect(component.selectedBranch()?.name).toBe('Sucursal Centro');

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows[0].classList).toContain('is-selected');
    expect(rows[1].classList).not.toContain('is-selected');

    const selectedButton = rows[0].querySelector('button');
    expect(selectedButton.getAttribute('aria-pressed')).toBe('true');
    expect(selectedButton.textContent).toContain('Seleccionada');
    expect(fixture.nativeElement.textContent).toContain('Sucursal seleccionada: Sucursal Centro');
  });

  it('mantiene una sola sucursal seleccionada a la vez', () => {
    service.getAll.mockReturnValue(of(branches));

    createComponent();
    component.selectBranch(branches[0]);
    component.selectBranch(branches[1]);
    fixture.detectChanges();

    expect(component.selectedBranchId()).toBe('branch-2');
    expect(component.selectedBranch()?.name).toBe('Sucursal Norte');

    const selectedRows = fixture.nativeElement.querySelectorAll('tbody tr.is-selected');
    expect(selectedRows).toHaveLength(1);
    expect(selectedRows[0].textContent).toContain('Sucursal Norte');
  });

  it('muestra las acciones de administración solo para administradores', () => {
    auth.hasAnyRole.mockReturnValue(true);
    service.getAll.mockReturnValue(of(branches));

    createComponent();

    expect(fixture.nativeElement.textContent).toContain('Nueva sucursal');
    expect(fixture.nativeElement.textContent).toContain('Editar');
    expect(fixture.nativeElement.textContent).toContain('Eliminar');
  });

  it('elimina una sucursal confirmada y la quita del listado', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    auth.hasAnyRole.mockReturnValue(true);
    service.getAll.mockReturnValue(of(branches));
    service.delete.mockReturnValue(of(undefined));

    createComponent();
    component.deleteBranch(branches[0]);
    fixture.detectChanges();

    expect(service.delete).toHaveBeenCalledWith('branch-1');
    expect(component.branches()).toEqual([branches[1]]);
    expect(fixture.nativeElement.textContent).not.toContain('Sucursal Centro');
  });

  it('muestra el error cuando falla la eliminación', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    auth.hasAnyRole.mockReturnValue(true);
    service.getAll.mockReturnValue(of(branches));
    service.delete.mockReturnValue(throwError(() => ({ status: 403 })));

    createComponent();
    component.deleteBranch(branches[0]);
    fixture.detectChanges();

    expect(component.deleteError()).toBe('No tenés permisos para eliminar sucursales.');
    expect(component.branches()).toHaveLength(2);
  });
});
