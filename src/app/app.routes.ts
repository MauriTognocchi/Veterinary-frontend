import { Routes } from '@angular/router';
import { AnimalTypeForm } from './features/animal-types/pages/animal-type-form/animal-type-form';
import { AnimalTypeList } from './features/animal-types/pages/animal-type-list/animal-type-list';
import { OwnerList } from './features/owners/pages/owner-list/owner-list';
import { OwnerForm } from './features/owners/pages/owner-form/owner-form';
import { OwnerDetail } from './features/owners/pages/owner-detail/owner-detail';
import { Login } from './features/auth/pages/login/login';
import { Register } from './features/auth/pages/register/register';
import { Forbidden } from './features/auth/pages/forbidden/forbidden';
import { Home } from './home/pages/home/home';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import {
      ANIMAL_TYPE_ADMIN_ROLES,
      OWNER_VIEW_ROLES,
    } from './core/models/auth.model';
import { BreedForm } from './features/breeds/pages/breed-form/breed-form';
import { BreedList } from './features/breeds/pages/breed-list/breed-list';
import { BREED_ADMIN_ROLES } from './core/models/auth.model';
import { PetList } from './features/pets/pages/pet-list/pet-list';
import { PetForm } from './features/pets/pages/pet-form/pet-form';
import { PetDetail } from './features/pets/pages/pet-detail/pet-detail';
import {
  PET_CREATE_ROLES,
  PET_VIEW_ROLES,
  PET_WRITE_ROLES,
} from './core/models/auth.model';
import { BranchList } from './features/branches/pages/branch-list/branch-list';
import { BranchForm } from './features/branches/pages/branch-form/branch-form';
import { BranchDetail } from './features/branches/pages/branch-detail/branch-detail';
import { BRANCH_ADMIN_ROLES } from './core/models/auth.model';
import { UserRegister } from './features/users/pages/user-register/user-register';
import { UserList } from './features/users/pages/user-list/user-list';
import { UserDetail } from './features/users/pages/user-detail/user-detail';
import { USER_ADMIN_ROLES } from './core/models/auth.model';
import { VeterinarianList } from './features/veterinarians/pages/veterinarian-list/veterinarian-list';
import { VeterinarianForm } from './features/veterinarians/pages/veterinarian-form/veterinarian-form';
import { VeterinarianDetail } from './features/veterinarians/pages/veterinarian-detail/veterinarian-detail';
import {
      VETERINARIAN_ADMIN_ROLES,
      VETERINARIAN_VIEW_ROLES,
    } from './core/models/auth.model';
    
import { ConditionList } from './features/conditions/pages/condition-list/condition-list';
import { ConditionForm } from './features/conditions/pages/condition-form/condition-form';
import { ReceptionistList } from './features/receptionists/pages/receptionist-list/receptionist-list';
import { ReceptionistForm } from './features/receptionists/pages/receptionist-form/receptionist-form';
import { ReceptionistDetail } from './features/receptionists/pages/receptionist-detail/receptionist-detail';
import {
      RECEPTIONIST_ADMIN_ROLES,
      RECEPTIONIST_VIEW_ROLES,
    } from './core/models/auth.model';
import { AppointmentList } from './features/appointments/pages/appointment-list/appointment-list';
import { AppointmentForm } from './features/appointments/pages/appointment-form/appointment-form';
import {
      APPOINTMENT_CREATE_ROLES,
      APPOINTMENT_UPDATE_ROLES,
      APPOINTMENT_VIEW_ROLES,
      MEDICATION_ADMIN_ROLES,
      VISIT_WRITE_ROLES,
    } from './core/models/auth.model';
import { VisitList } from './features/visits/pages/visit-list/visit-list';
import { VisitForm } from './features/visits/pages/visit-form/visit-form';
import { VisitDetail } from './features/visits/pages/visit-detail/visit-detail';
import { MedicationList } from './features/medications/pages/medication-list/medication-list';
import { MedicationForm } from './features/medications/pages/medication-form/medication-form';
import { StudyList } from './features/studies/pages/study-list/study-list';
import { StudyForm } from './features/studies/pages/study-form/study-form';
    
    export const routes: Routes = [
      { path: '', component: Home },
      { path: 'login', component: Login },
      { path: 'register', component: Register },
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
        data: { permissions: ['CREATE_OWNERS'] },
      },
      {
        path: 'owners/:externalId/edit',
        component: OwnerForm,
        canActivate: [authGuard, roleGuard],
        data: { permissions: ['UPDATE_OWNERS'] },
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
        data: { roles: PET_CREATE_ROLES },
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
      {
        path: 'users',
        component: UserList,
        canActivate: [authGuard, roleGuard],
        data: { permissions: ['VIEW_USERS'] },
      },
      {
        path: 'users/new',
        component: UserRegister,
        canActivate: [authGuard, roleGuard],
        data: { roles: USER_ADMIN_ROLES },
      },
      {
        path: 'users/:externalId',
        component: UserDetail,
        canActivate: [authGuard, roleGuard],
        data: { permissions: ['VIEW_USERS'] },
      },
      {
        path: 'veterinarians',
        component: VeterinarianList,
        canActivate: [authGuard, roleGuard],
        data: { roles: VETERINARIAN_VIEW_ROLES },
      },
      {
        path: 'veterinarians/:externalId/edit',
        component: VeterinarianForm,
        canActivate: [authGuard, roleGuard],
        data: { roles: VETERINARIAN_ADMIN_ROLES },
      },
      {
        path: 'veterinarians/:externalId',
        component: VeterinarianDetail,
        canActivate: [authGuard, roleGuard],
        data: { roles: VETERINARIAN_VIEW_ROLES },
      },
      {
        path: 'conditions',
        component: ConditionList,
        canActivate: [authGuard, roleGuard],
        data: { permissions: ['VIEW_CLINICAL_RECORDS'] },
      },
      {
        path: 'conditions/new',
        component: ConditionForm,
        canActivate: [authGuard, roleGuard],
        data: { permissions: ['CREATE_CLINICAL_RECORDS'] },
      },
      {
        path: 'conditions/:externalId/edit',
        component: ConditionForm,
        canActivate: [authGuard, roleGuard],
        data: { permissions: ['UPDATE_CLINICAL_RECORDS'] },
      },
      {
        path: 'receptionists',
        component: ReceptionistList,
        canActivate: [authGuard, roleGuard],
        data: { roles: RECEPTIONIST_VIEW_ROLES },
      },
      {
        path: 'receptionists/:externalId/edit',
        component: ReceptionistForm,
        canActivate: [authGuard, roleGuard],
        data: { roles: RECEPTIONIST_ADMIN_ROLES },
      },
      {
        path: 'receptionists/:externalId',
        component: ReceptionistDetail,
        canActivate: [authGuard, roleGuard],
        data: { roles: RECEPTIONIST_VIEW_ROLES },
      },
      {
        path: 'appointments',
        component: AppointmentList,
        canActivate: [authGuard, roleGuard],
        data: { roles: APPOINTMENT_VIEW_ROLES },
      },
      {
        path: 'appointments/new',
        component: AppointmentForm,
        canActivate: [authGuard, roleGuard],
        data: { roles: APPOINTMENT_CREATE_ROLES },
      },
      {
        path: 'appointments/:externalId/edit',
        component: AppointmentForm,
        canActivate: [authGuard, roleGuard],
        data: { roles: APPOINTMENT_UPDATE_ROLES },
      },
      {
        path: 'visits',
        component: VisitList,
        canActivate: [authGuard, roleGuard],
        data: { permissions: ['VIEW_CLINICAL_RECORDS'] },
      },
      {
        path: 'visits/new',
        component: VisitForm,
        canActivate: [authGuard, roleGuard],
        data: { roles: VISIT_WRITE_ROLES },
      },
      {
        path: 'visits/walk-in',
        component: VisitForm,
        canActivate: [authGuard, roleGuard],
        data: { roles: VISIT_WRITE_ROLES },
      },
      {
        path: 'visits/:externalId/edit',
        component: VisitForm,
        canActivate: [authGuard, roleGuard],
        data: { roles: VISIT_WRITE_ROLES },
      },
      {
        path: 'visits/:externalId',
        component: VisitDetail,
        canActivate: [authGuard, roleGuard],
        data: { permissions: ['VIEW_CLINICAL_RECORDS'] },
      },
      {
        path: 'medications',
        component: MedicationList,
        canActivate: [authGuard, roleGuard],
        data: { permissions: ['VIEW_MEDICATIONS'] },
      },
      {
        path: 'medications/new',
        component: MedicationForm,
        canActivate: [authGuard, roleGuard],
        data: { roles: MEDICATION_ADMIN_ROLES },
      },
      {
        path: 'medications/:externalId/edit',
        component: MedicationForm,
        canActivate: [authGuard, roleGuard],
        data: { roles: MEDICATION_ADMIN_ROLES },
      },
      {
  path: 'studies',
  component: StudyList,
  canActivate: [authGuard, roleGuard],
  data: { permissions: ['VIEW_CLINICAL_RECORDS'] },
},
{
  path: 'studies/new',
  component: StudyForm,
  canActivate: [authGuard, roleGuard],
  data: { roles: ['ROLE_VETERINARIAN'] },
},
{
  path: 'studies/:externalId/edit',
  component: StudyForm,
  canActivate: [authGuard, roleGuard],
  data: { permissions: ['UPDATE_CLINICAL_RECORDS'] },
},
    ];