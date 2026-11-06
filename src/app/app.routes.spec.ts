import { routes } from './app.routes';
import { ANIMAL_TYPE_ADMIN_ROLES } from './core/models/auth.model';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { AnimalTypeForm } from './features/animal-types/pages/animal-type-form/animal-type-form';
import { AnimalTypeList } from './features/animal-types/pages/animal-type-list/animal-type-list';

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
