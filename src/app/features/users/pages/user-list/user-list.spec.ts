import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { UserResponse } from '../../models/user.model';
import { UserService } from '../../services/user';
import { UserList } from './user-list';

describe('UserList', () => {
  let fixture: ComponentFixture<UserList>;
  let component: UserList;
  let service: {
    getAll: ReturnType<typeof vi.fn>;
    deactivate: ReturnType<typeof vi.fn>;
    reactivate: ReturnType<typeof vi.fn>;
  };
  let auth: { hasAnyPermission: ReturnType<typeof vi.fn>; hasAnyRole: ReturnType<typeof vi.fn> };

  const users: UserResponse[] = [
    {
      externalId: 'user-1',
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@veterinaria.com',
      userState: 'ACTIVE',
    },
    {
      externalId: 'user-2',
      firstName: 'Bruno',
      lastName: 'Gómez',
      email: 'bruno@veterinaria.com',
      userState: 'ACTIVE',
    },
    {
      externalId: 'user-3',
      firstName: 'Carla',
      lastName: 'Díaz',
      email: 'carla@veterinaria.com',
      userState: 'INACTIVE',
    },
  ];

  function createComponent(): void {
    fixture = TestBed.createComponent(UserList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('muestra DTOs públicos sin email ni estado y busca por nombre', () => {
    auth.hasAnyRole.mockReturnValue(false);
    service.getAll.mockReturnValue(of([{ externalId: 'user-1', firstName: 'Ana', lastName: 'Pérez' }]));
    createComponent();
    expect(fixture.nativeElement.textContent).toContain('Ana');
    expect(fixture.nativeElement.querySelector('#user-status')).toBeNull();
    expect(fixture.nativeElement.querySelector('.state-badge')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Email');
    component.updateSearch(inputEvent('ana'));
    expect(component.filteredUsers()).toHaveLength(1);
  });

  function inputEvent(value: string): Event {
    return { target: { value } } as unknown as Event;
  }

  function deleteButtons(): HTMLButtonElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        'button.btn-danger',
      ),
    );
  }

  function reactivateButtons(): HTMLButtonElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        'button.reactivate-button',
      ),
    );
  }

  beforeEach(async () => {
    service = {
      getAll: vi.fn(),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
    };
    auth = {
      hasAnyPermission: vi.fn().mockReturnValue(false),
      hasAnyRole: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [UserList],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: service },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el estado de carga y luego los usuarios activos e inactivos', () => {
    const request = new Subject<UserResponse[]>();
    service.getAll.mockReturnValue(request.asObservable());

    createComponent();

    expect(component.loading()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Cargando usuarios...');

    request.next(users);
    request.complete();
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Ana');
    expect(fixture.nativeElement.textContent).toContain('Pérez');
    expect(fixture.nativeElement.textContent).toContain('ana@veterinaria.com');
    expect(fixture.nativeElement.textContent).toContain('ACTIVE');
    expect(fixture.nativeElement.textContent).toContain('INACTIVE');
  });

  it('busca localmente por nombre, apellido y email', () => {
    service.getAll.mockReturnValue(of(users));
    createComponent();

    component.updateSearch(inputEvent('bruno'));
    expect(component.filteredUsers()).toEqual([users[1]]);

    component.updateSearch(inputEvent('pérez'));
    expect(component.filteredUsers()).toEqual([users[0]]);

    component.updateSearch(inputEvent('carla@'));
    expect(component.filteredUsers()).toEqual([users[2]]);
  });

  it('filtra por estado y combina con la búsqueda', () => {
    service.getAll.mockReturnValue(of(users));
    createComponent();

    component.updateStatusFilter(inputEvent('ACTIVE'));
    expect(component.filteredUsers()).toEqual([users[0], users[1]]);

    component.updateStatusFilter(inputEvent('INACTIVE'));
    expect(component.filteredUsers()).toEqual([users[2]]);

    component.updateStatusFilter(inputEvent('ALL'));
    component.updateSearch(inputEvent('ana'));
    expect(component.filteredUsers()).toEqual([users[0]]);
  });

  it('muestra un mensaje cuando el filtro no devuelve resultados', () => {
    service.getAll.mockReturnValue(of(users));
    createComponent();

    component.updateSearch(inputEvent('inexistente'));
    fixture.detectChanges();

    expect(component.filteredUsers()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain(
      'No se encontraron usuarios con esos criterios.',
    );
  });

  it('muestra la acción de baja solo con DELETE_USERS y en usuarios activos', () => {
    service.getAll.mockReturnValue(of(users));

    createComponent();
    expect(deleteButtons()).toHaveLength(0);

    auth.hasAnyPermission.mockReturnValue(true);
    fixture = TestBed.createComponent(UserList);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(auth.hasAnyPermission).toHaveBeenCalledWith(['DELETE_USERS']);
    expect(deleteButtons()).toHaveLength(2);
  });

  it('no desactiva si el usuario ya está inactivo', () => {
    auth.hasAnyPermission.mockReturnValue(true);
    const confirm = vi.spyOn(window, 'confirm');
    service.getAll.mockReturnValue(of(users));
    createComponent();

    component.deactivateUser(users[2]);

    expect(confirm).not.toHaveBeenCalled();
    expect(service.deactivate).not.toHaveBeenCalled();
  });

  it('no desactiva si el usuario cancela la confirmación', () => {
    auth.hasAnyPermission.mockReturnValue(true);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    service.getAll.mockReturnValue(of(users));
    createComponent();

    component.deactivateUser(users[0]);

    expect(confirm).toHaveBeenCalled();
    expect(service.deactivate).not.toHaveBeenCalled();
    expect(component.users()[0].userState).toBe('ACTIVE');
  });

  it('desactiva tras confirmar y mantiene al usuario con estado INACTIVE', () => {
    auth.hasAnyPermission.mockReturnValue(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    service.getAll.mockReturnValue(of(users));
    service.deactivate.mockReturnValue(of(undefined));

    createComponent();
    component.deactivateUser(users[0]);
    fixture.detectChanges();

    expect(service.deactivate).toHaveBeenCalledWith('user-1');
    expect(component.users()).toHaveLength(3);
    expect(
      component.users().find((user) => user.externalId === 'user-1')?.userState,
    ).toBe('INACTIVE');
    expect(component.success()).toContain('Ana Pérez quedó inactivo.');
    expect(fixture.nativeElement.textContent).toContain('INACTIVE');
    expect(deleteButtons()).toHaveLength(1);
  });

  it('muestra el error cuando falla la baja', () => {
    auth.hasAnyPermission.mockReturnValue(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    service.getAll.mockReturnValue(of(users));
    service.deactivate.mockReturnValue(throwError(() => ({ status: 403 })));

    createComponent();
    component.deactivateUser(users[0]);
    fixture.detectChanges();

    expect(component.deleteError()).toBe(
      'No tenés permisos para desactivar usuarios.',
    );
    expect(component.users()[0].userState).toBe('ACTIVE');
  });

  it('muestra la acción de reactivación solo con UPDATE_USERS y en usuarios inactivos', () => {
    service.getAll.mockReturnValue(of(users));

    createComponent();
    expect(reactivateButtons()).toHaveLength(0);

    auth.hasAnyPermission.mockReturnValue(true);
    fixture = TestBed.createComponent(UserList);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(auth.hasAnyPermission).toHaveBeenCalledWith(['UPDATE_USERS']);
    const buttons = reactivateButtons();
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toContain('Reactivar cuenta');
  });

  it('no reactiva usuarios activos ni sin permiso', () => {
    const confirm = vi.spyOn(window, 'confirm');
    service.getAll.mockReturnValue(of(users));
    createComponent();

    component.reactivateUser(users[2]);
    expect(confirm).not.toHaveBeenCalled();
    expect(service.reactivate).not.toHaveBeenCalled();

    auth.hasAnyPermission.mockReturnValue(true);
    fixture = TestBed.createComponent(UserList);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.reactivateUser(users[0]);
    expect(confirm).not.toHaveBeenCalled();
    expect(service.reactivate).not.toHaveBeenCalled();
  });

  it('no reactiva si el usuario cancela la confirmación', () => {
    auth.hasAnyPermission.mockReturnValue(true);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    service.getAll.mockReturnValue(of(users));
    createComponent();

    component.reactivateUser(users[2]);

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(service.reactivate).not.toHaveBeenCalled();
    expect(component.users()[2].userState).toBe('INACTIVE');
  });

  it('bloquea envíos duplicados mientras se reactiva', () => {
    auth.hasAnyPermission.mockReturnValue(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    service.getAll.mockReturnValue(of(users));
    const request = new Subject<void>();
    service.reactivate.mockReturnValue(request.asObservable());

    createComponent();
    component.reactivateUser(users[2]);
    fixture.detectChanges();

    expect(service.reactivate).toHaveBeenCalledTimes(1);
    expect(reactivateButtons()[0].disabled).toBe(true);
    expect(reactivateButtons()[0].textContent).toContain('Reactivando...');

    component.reactivateUser(users[2]);
    expect(service.reactivate).toHaveBeenCalledTimes(1);

    request.next();
    request.complete();
    fixture.detectChanges();

    expect(reactivateButtons()).toHaveLength(0);
  });

  it('reactiva tras confirmar, actualiza el estado y no dispara otras acciones', () => {
    auth.hasAnyPermission.mockReturnValue(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    service.getAll.mockReturnValue(of(users));
    service.reactivate.mockReturnValue(of(undefined));

    createComponent();
    component.reactivateUser(users[2]);
    fixture.detectChanges();

    expect(service.reactivate).toHaveBeenCalledWith('user-3');
    expect(
      component.users().find((user) => user.externalId === 'user-3')?.userState,
    ).toBe('ACTIVE');
    expect(component.success()).toContain('Carla Díaz quedó activo.');
    expect(fixture.nativeElement.textContent).toContain('ACTIVE');
    expect(reactivateButtons()).toHaveLength(0);
    expect(service.getAll).toHaveBeenCalledTimes(1);
    expect(service.deactivate).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'El usuario ya no existe.'],
    [400, 'El usuario ya estaba activo.'],
    [403, 'No tenés permisos para reactivar usuarios.'],
    [500, 'No pudimos reactivar el usuario. Intentá nuevamente.'],
  ])(
    'muestra el error de reactivación para el estado %s',
    (status, message) => {
      auth.hasAnyPermission.mockReturnValue(true);
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      service.getAll.mockReturnValue(of(users));
      service.reactivate.mockReturnValue(throwError(() => ({ status })));

      createComponent();
      component.reactivateUser(users[2]);
      fixture.detectChanges();

      expect(component.reactivateError()).toBe(message);
      expect(
        component.users().find((user) => user.externalId === 'user-3')
          ?.userState,
      ).toBe('INACTIVE');
      expect(component.reactivatingId()).toBeNull();
    },
  );

  it('muestra el error de carga y permite reintentar', () => {
    service.getAll
      .mockReturnValueOnce(throwError(() => ({ status: 500 })))
      .mockReturnValueOnce(of(users));

    createComponent();

    expect(component.loadErrorRetryable()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No pudimos cargar los usuarios. Intentá nuevamente en unos minutos.',
    );

    component.retryLoad();
    fixture.detectChanges();

    expect(service.getAll).toHaveBeenCalledTimes(2);
    expect(component.error()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Ana');
  });
});
