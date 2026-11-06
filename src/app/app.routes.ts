import { Routes } from '@angular/router';
import { AnimalTypeForm } from './features/animal-types/pages/animal-type-form/animal-type-form';
import { AnimalTypeList } from './features/animal-types/pages/animal-type-list/animal-type-list';
import { OwnerList } from './features/owners/pages/owner-list/owner-list';
import { OwnerForm } from './features/owners/pages/owner-form/owner-form';
import { OwnerDetail } from './features/owners/pages/owner-detail/owner-detail';
import { Login } from './features/auth/pages/login/login';
import { Forbidden } from './features/auth/pages/forbidden/forbidden';
import { Home } from './home/pages/home/home';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import {
  ANIMAL_TYPE_ADMIN_ROLES,
  OWNER_VIEW_ROLES,
  OWNER_WRITE_ROLES,
} from './core/models/auth.model';
 import { BreedForm } from './features/breeds/pages/breed-form/breed-form';
    import { BreedList } from './features/breeds/pages/breed-list/breed-list';
    import { BREED_ADMIN_ROLES } from './core/models/auth.model';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'forbidden', component: Forbidden },
  {
    path: 'animal-types',
    component: AnimalTypeList,
    canActivate: [authGuard, roleGuard],
    data: { roles: ANIMAL_TYPE_ADMIN_ROLES },
  },
  {
    path: 'animal-types/new',
    component: AnimalTypeForm,
    canActivate: [authGuard, roleGuard],
    data: { roles: ANIMAL_TYPE_ADMIN_ROLES },
  },
  {
    path: 'animal-types/:externalId/edit',
    component: AnimalTypeForm,
    canActivate: [authGuard, roleGuard],
    data: { roles: ANIMAL_TYPE_ADMIN_ROLES },
  },
  {
    path: 'owners',
    component: OwnerList,
    canActivate: [authGuard, roleGuard],
    data: { roles: OWNER_VIEW_ROLES },
  },
  {
    path: 'owners/new',
    component: OwnerForm,
    canActivate: [authGuard, roleGuard],
    data: { roles: OWNER_WRITE_ROLES },
  },
  {
    path: 'owners/:externalId/edit',
    component: OwnerForm,
    canActivate: [authGuard, roleGuard],
    data: { roles: OWNER_WRITE_ROLES },
  },
  {
    path: 'owners/:externalId',
    component: OwnerDetail,
    canActivate: [authGuard, roleGuard],
    data: { roles: OWNER_VIEW_ROLES },
  },
  {
        path: 'breeds',
        component: BreedList,
        canActivate: [authGuard, roleGuard],
        data: { roles: BREED_ADMIN_ROLES },
      },
      {
        path: 'breeds/new',
        component: BreedForm,
        canActivate: [authGuard, roleGuard],
        data: { roles: BREED_ADMIN_ROLES },
      },
      {
        path: 'breeds/:externalId/edit',
        component: BreedForm,
        canActivate: [authGuard, roleGuard],
        data: { roles: BREED_ADMIN_ROLES },
      },
];
