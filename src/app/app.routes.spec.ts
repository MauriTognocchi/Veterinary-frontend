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
