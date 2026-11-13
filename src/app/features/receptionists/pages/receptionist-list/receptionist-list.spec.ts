import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { BranchService } from '../../../branches/services/branch';
import { ReceptionistResponse } from '../../models/receptionist.model';
import { ReceptionistService } from '../../services/receptionist';
import { ReceptionistList } from './receptionist-list';

describe('ReceptionistList: reactivación', () => {
  let fixture: ComponentFixture<ReceptionistList>;
  let component: ReceptionistList;
  let service: { getAll: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>; reactivate: ReturnType<typeof vi.fn> };
  let auth: { hasAnyRole: ReturnType<typeof vi.fn>; hasAnyPermission: ReturnType<typeof vi.fn> };
  const inactive: ReceptionistResponse = {
    externalId: 'rec-1', firstName: 'Ana', lastName: 'García',
    phone: '123', email: 'ana@example.com', active: false, branch: null,
  };

  beforeEach(async () => {
    service = { getAll: vi.fn().mockReturnValue(of([inactive])), delete: vi.fn(), reactivate: vi.fn() };
    auth = { hasAnyRole: vi.fn().mockReturnValue(false), hasAnyPermission: vi.fn().mockReturnValue(true) };
    await TestBed.configureTestingModule({
      imports: [ReceptionistList],
      providers: [
        { provide: ReceptionistService, useValue: service },
        { provide: BranchService, useValue: { getAll: () => of([]) } },
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
      ],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  function create(): void {
    fixture = TestBed.createComponent(ReceptionistList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('muestra el listado público sin estado, datos de contacto ni carga de sucursales', () => {
    const branch = vi.fn();
    TestBed.overrideProvider(BranchService, { useValue: { getAll: branch } });
    service.getAll.mockReturnValue(of([{ externalId: 'rec-1', firstName: 'Ana', lastName: 'García' }]));
    create();
    expect(branch).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Ana');
    expect(fixture.nativeElement.querySelector('#filter-branch')).toBeNull();
    expect(fixture.nativeElement.querySelector('.status-badge')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Teléfono');
  });

  it('solo muestra Reactivar para perfil inactivo y rol ADMIN (UPDATE_USERS no alcanza)', () => {
    create();
    expect(fixture.nativeElement.querySelector('.reactivate-button')).toBeNull();
    expect(auth.hasAnyRole).toHaveBeenCalledWith(['ROLE_ADMIN']);
    auth.hasAnyRole.mockReturnValue(true);
    fixture = TestBed.createComponent(ReceptionistList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.reactivate-button')).not.toBeNull();
    component.receptionists.set([{ ...inactive, active: true }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.reactivate-button')).toBeNull();
  });

  it('cancelar no llama al servicio; confirmar bloquea duplicados y actualiza filtro con el DTO', () => {
    auth.hasAnyRole.mockReturnValue(true);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    create();
    component.reactivateReceptionist(inactive);
    expect(service.reactivate).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    const pending = new Subject<ReceptionistResponse>();
    service.reactivate.mockReturnValue(pending);
    component.updateStatusFilter({ target: { value: 'INACTIVE' } } as unknown as Event);
    component.reactivateReceptionist(inactive);
    component.reactivateReceptionist(inactive);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Ana García'));
    expect(service.reactivate).toHaveBeenCalledExactlyOnceWith('rec-1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Reactivando...');
    expect(fixture.nativeElement.querySelector('.reactivate-button').disabled).toBe(true);
    pending.next({ ...inactive, firstName: 'Anabel', active: true });
    pending.complete();
    fixture.detectChanges();
    expect(component.receptionists()[0].firstName).toBe('Anabel');
    expect(component.filteredReceptionists()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Se reactivó el perfil de recepcionista de Anabel García');
  });

  it.each([409, 404, 401, 403])('mantiene el perfil y permite reintentar tras %i', (status) => {
    auth.hasAnyRole.mockReturnValue(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    service.reactivate.mockReturnValue(throwError(() => ({ status, error: status === 409 ? { message: 'Credenciales deshabilitadas.' } : {} })));
    create();
    component.reactivateReceptionist(inactive);
    expect(component.receptionists()).toEqual([inactive]);
    expect(component.reactivatingId()).toBeNull();
    expect(component.reactivateError()).toBeTruthy();
    if (status === 409) expect(component.reactivateError()).toBe('Credenciales deshabilitadas.');
    component.reactivateReceptionist(inactive);
    expect(service.reactivate).toHaveBeenCalledTimes(2);
  });
});
