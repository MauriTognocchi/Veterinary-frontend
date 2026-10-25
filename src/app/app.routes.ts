import { Routes } from '@angular/router';
import { OwnerList } from './features/owners/pages/owner-list/owner-list';
import { Login } from './features/auth/pages/login/login';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'owners', component: OwnerList }
];
