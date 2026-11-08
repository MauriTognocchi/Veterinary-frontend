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
import { PetList } from './features/pets/pages/pet-list/pet-list';
import { PetForm } from './features/pets/pages/pet-form/pet-form';
import { PetDetail } from './features/pets/pages/pet-detail/pet-detail';
import { PET_VIEW_ROLES, PET_WRITE_ROLES } from './core/models/auth.model';
import { BranchList } from './features/branches/pages/branch-list/branch-list';
import { BranchForm } from './features/branches/pages/branch-form/branch-form';
import { BranchDetail } from './features/branches/pages/branch-detail/branch-detail';
import { BRANCH_ADMIN_ROLES } from './core/models/auth.model';

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
  {
    path: 'branches',
    component: BranchList,
    canActivate: [authGuard, roleGuard],
    data: { permissions: ['VIEW_BRANCHES'] },
  },
  {
    path: 'branches/new',
    component: BranchForm,
    canActivate: [authGuard, roleGuard],
    data: { roles: BRANCH_ADMIN_ROLES },
  },
  {
    path: 'branches/:externalId/edit',
    component: BranchForm,
    canActivate: [authGuard, roleGuard],
    data: { roles: BRANCH_ADMIN_ROLES },
  },
  {
    path: 'branches/:externalId',
    component: BranchDetail,
    canActivate: [authGuard, roleGuard],
    data: { permissions: ['VIEW_BRANCHES'] },
  },
  {
    path: 'pets',
    component: PetList,
    canActivate: [authGuard, roleGuard],
    data: { roles: PET_VIEW_ROLES },
  },
  {
    path: 'pets/new',
    component: PetForm,
    canActivate: [authGuard, roleGuard],
    data: { roles: PET_WRITE_ROLES },
  },
  {
    path: 'pets/:externalId/edit',
    component: PetForm,
    canActivate: [authGuard, roleGuard],
    data: { roles: PET_WRITE_ROLES },
  },
  {
    path: 'pets/:externalId',
    component: PetDetail,
    canActivate: [authGuard, roleGuard],
    data: { roles: PET_VIEW_ROLES },
  },
];
