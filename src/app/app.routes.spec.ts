import { routes } from './app.routes';
import { ANIMAL_TYPE_ADMIN_ROLES } from './core/models/auth.model';
import { USER_ADMIN_ROLES } from './core/models/auth.model';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { AnimalTypeForm } from './features/animal-types/pages/animal-type-form/animal-type-form';
import { AnimalTypeList } from './features/animal-types/pages/animal-type-list/animal-type-list';
import { OwnerForm } from './features/owners/pages/owner-form/owner-form';
import { Register } from './features/auth/pages/register/register';
import { UserRegister } from './features/users/pages/user-register/user-register';
import { UserList } from './features/users/pages/user-list/user-list';
import { UserDetail } from './features/users/pages/user-detail/user-detail';
import { APPOINTMENT_VIEW_ROLES } from './core/models/auth.model';
import { AppointmentList } from './features/appointments/pages/appointment-list/appointment-list';
import { MEDICATION_ADMIN_ROLES, VISIT_WRITE_ROLES } from './core/models/auth.model';
import { VisitList } from './features/visits/pages/visit-list/visit-list';
import { VisitForm } from './features/visits/pages/visit-form/visit-form';
import { VisitDetail } from './features/visits/pages/visit-detail/visit-detail';
import { MedicationList } from './features/medications/pages/medication-list/medication-list';
import { MedicationForm } from './features/medications/pages/medication-form/medication-form';
import {
  PET_CREATE_ROLES,
  PET_WRITE_ROLES,
} from './core/models/auth.model';
import { PetForm } from './features/pets/pages/pet-form/pet-form';

const ANIMAL_TYPE_ROUTES = [
  {
    path: 'animal-types',
    component: AnimalTypeList,
  },
  {
    path: 'animal-types/new',
    component: AnimalTypeForm,
  },
  {
    path: 'animal-types/:externalId/edit',
    component: AnimalTypeForm,
  },
];

describe('rutas de tipos de animales', () => {
  it.each(ANIMAL_TYPE_ROUTES)(
    'protege $path con sesión y ROLE_ADMIN',
    ({ path, component }) => {
      const route = routes.find((item) => item.path === path);

      expect(route?.component).toBe(component);
      expect(route?.canActivate).toEqual([authGuard, roleGuard]);
      expect(route?.data?.['roles']).toEqual(ANIMAL_TYPE_ADMIN_ROLES);
      expect(route?.data?.['permissions']).toBeUndefined();
    },
  );
});

describe('rutas de registro', () => {
  it('expone el registro público de propietarios sin guards', () => {
    const route = routes.find((item) => item.path === 'register');

    expect(route?.component).toBe(Register);
    expect(route?.canActivate).toBeUndefined();
  });

  it('protege el registro de usuarios con sesión y ROLE_ADMIN', () => {
    const route = routes.find((item) => item.path === 'users/new');

    expect(route?.component).toBe(UserRegister);
    expect(route?.canActivate).toEqual([authGuard, roleGuard]);
    expect(route?.data?.['roles']).toEqual(USER_ADMIN_ROLES);
  });

  it('permite registrar propietarios con el permiso CREATE_OWNERS', () => {
    const route = routes.find((item) => item.path === 'owners/new');

    expect(route?.component).toBe(OwnerForm);
    expect(route?.canActivate).toEqual([authGuard, roleGuard]);
    expect(route?.data?.['permissions']).toEqual(['CREATE_OWNERS']);
  });

  it('permite editar propietarios con el permiso UPDATE_OWNERS', () => {
    const route = routes.find((item) => item.path === 'owners/:externalId/edit');

    expect(route?.component).toBe(OwnerForm);
    expect(route?.canActivate).toEqual([authGuard, roleGuard]);
    expect(route?.data?.['permissions']).toEqual(['UPDATE_OWNERS']);
  });
});

describe('rutas de administración de usuarios', () => {
  it('protege el listado con sesión y VIEW_USERS', () => {
    const route = routes.find((item) => item.path === 'users');

    expect(route?.component).toBe(UserList);
    expect(route?.canActivate).toEqual([authGuard, roleGuard]);
    expect(route?.data?.['permissions']).toEqual(['VIEW_USERS']);
  });

  it('protege el detalle con sesión y VIEW_USERS', () => {
    const route = routes.find((item) => item.path === 'users/:externalId');

    expect(route?.component).toBe(UserDetail);
    expect(route?.canActivate).toEqual([authGuard, roleGuard]);
    expect(route?.data?.['permissions']).toEqual(['VIEW_USERS']);
  });

  it('mantiene el registro de usuarios exclusivo de ADMIN', () => {
    const route = routes.find((item) => item.path === 'users/new');

    expect(route?.component).toBe(UserRegister);
    expect(route?.canActivate).toEqual([authGuard, roleGuard]);
    expect(route?.data?.['roles']).toEqual(USER_ADMIN_ROLES);
    expect(route?.data?.['permissions']).toBeUndefined();
  });
});

describe('rutas de mascotas', () => {
  it('permite crear mascotas a ADMIN, RECEPTIONIST y OWNER', () => {
    const route = routes.find((item) => item.path === 'pets/new');

    expect(route?.component).toBe(PetForm);
    expect(route?.canActivate).toEqual([authGuard, roleGuard]);
    expect(route?.data?.['roles']).toEqual(PET_CREATE_ROLES);
    expect(route?.data?.['roles']).toContain('ROLE_CLIENT');
  });

  it('mantiene la edición limitada a ADMIN y RECEPTIONIST', () => {
    const route = routes.find(
      (item) => item.path === 'pets/:externalId/edit',
    );

    expect(route?.component).toBe(PetForm);
    expect(route?.canActivate).toEqual([authGuard, roleGuard]);
    expect(route?.data?.['roles']).toEqual(PET_WRITE_ROLES);
    expect(route?.data?.['roles']).not.toContain('ROLE_CLIENT');
  });
});

describe('rutas de turnos', () => {
  it('protege el listado de turnos con sesión y los roles de visualización', () => {
    const route = routes.find((item) => item.path === 'appointments');

    expect(route?.component).toBe(AppointmentList);
    expect(route?.canActivate).toEqual([authGuard, roleGuard]);
    expect(route?.data?.['roles']).toEqual(APPOINTMENT_VIEW_ROLES);
    expect(route?.data?.['permissions']).toBeUndefined();
  });
});

describe('rutas de visitas', () => {
  it.each([
    { path: 'visits', component: VisitList },
    { path: 'visits/:externalId', component: VisitDetail },
  ])('protege $path con VIEW_CLINICAL_RECORDS', ({ path, component }) => {
    const route = routes.find((item) => item.path === path);

    expect(route?.component).toBe(component);
    expect(route?.canActivate).toEqual([authGuard, roleGuard]);
    expect(route?.data?.['permissions']).toEqual(['VIEW_CLINICAL_RECORDS']);
    expect(route?.data?.['roles']).toBeUndefined();
  });

  it.each([
    'visits/new',
    'visits/walk-in',
    'visits/:externalId/edit',
  ])('reserva %s a ROLE_VETERINARIAN', (path) => {
    const route = routes.find((item) => item.path === path);

    expect(route?.component).toBe(VisitForm);
    expect(route?.canActivate).toEqual([authGuard, roleGuard]);
    expect(route?.data?.['roles']).toEqual(VISIT_WRITE_ROLES);
    expect(route?.data?.['permissions']).toBeUndefined();
  });
});

describe('rutas de medicamentos', () => {
  it('protege el listado con VIEW_MEDICATIONS', () => {
    const route = routes.find((item) => item.path === 'medications');

    expect(route?.component).toBe(MedicationList);
    expect(route?.canActivate).toEqual([authGuard, roleGuard]);
    expect(route?.data?.['permissions']).toEqual(['VIEW_MEDICATIONS']);
    expect(route?.data?.['roles']).toBeUndefined();
  });

  it.each(['medications/new', 'medications/:externalId/edit'])(
    'reserva %s a ROLE_ADMIN',
    (path) => {
      const route = routes.find((item) => item.path === path);

      expect(route?.component).toBe(MedicationForm);
      expect(route?.canActivate).toEqual([authGuard, roleGuard]);
      expect(route?.data?.['roles']).toEqual(MEDICATION_ADMIN_ROLES);
      expect(route?.data?.['permissions']).toBeUndefined();
    },
  );
});
