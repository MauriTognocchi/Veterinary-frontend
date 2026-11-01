import { Routes } from '@angular/router';
import { OwnerList } from './features/owners/pages/owner-list/owner-list';
import { OwnerForm } from './features/owners/pages/owner-form/owner-form';
import { OwnerDetail } from './features/owners/pages/owner-detail/owner-detail';
import { Login } from './features/auth/pages/login/login';
import { Home } from './home/pages/home/home';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'owners', component: OwnerList, canActivate: [authGuard] },
  { path: 'owners/new', component: OwnerForm, canActivate: [authGuard] },
  { path: 'owners/:externalId/edit', component: OwnerForm, canActivate: [authGuard] },
  { path: 'owners/:externalId', component: OwnerDetail, canActivate: [authGuard] }
];
