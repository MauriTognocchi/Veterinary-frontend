import { Routes } from '@angular/router';
import { OwnerList } from './features/owners/pages/owner-list/owner-list';
import { OwnerForm } from './features/owners/pages/owner-form/owner-form';
import { OwnerDetail } from './features/owners/pages/owner-detail/owner-detail';
import { Login } from './features/auth/pages/login/login';
import { Forbidden } from './features/auth/pages/forbidden/forbidden';
import { Home } from './home/pages/home/home';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { OWNER_VIEW_ROLES, OWNER_WRITE_ROLES } from './core/models/auth.model';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'forbidden', component: Forbidden },
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
];
