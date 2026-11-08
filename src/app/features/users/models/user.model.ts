export type UserState = 'ACTIVE' | 'INACTIVE';

export type UserStatusFilter = 'ALL' | UserState;

export interface UserResponse {
  externalId: string;
  firstName: string;
  lastName: string;
  email: string;
  userState: UserState;
}
