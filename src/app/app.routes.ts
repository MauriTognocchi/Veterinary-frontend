import { Routes } from '@angular/router';
import { OwnerList } from './features/owners/pages/owner-list/owner-list';
import { OwnerForm } from './features/owners/pages/owner-form/owner-form';
import { OwnerDetail } from './features/owners/pages/owner-detail/owner-detail';
import { Login } from './features/auth/pages/login/login';
import { Home } from './home/pages/home/home';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'owners', component: OwnerList },
  { path: 'owners/new', component: OwnerForm },
  { path: 'owners/:externalId/edit', component: OwnerForm },
  { path: 'owners/:externalId', component: OwnerDetail }
];
