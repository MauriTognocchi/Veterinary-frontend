export const USER_ROLES = [
  'ROLE_ADMIN',
  'ROLE_VETERINARIAN',
  'ROLE_RECEPTIONIST',
  'ROLE_CLIENT',
] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserPermission = string;

export const OWNER_VIEW_ROLES: readonly UserRole[] = [
  'ROLE_ADMIN',
  'ROLE_VETERINARIAN',
  'ROLE_RECEPTIONIST',
];

export const OWNER_WRITE_ROLES: readonly UserRole[] = [
  'ROLE_ADMIN',
  'ROLE_RECEPTIONIST',
];

export const ANIMAL_TYPE_ADMIN_ROLES: readonly UserRole[] = ['ROLE_ADMIN'];
export const BREED_ADMIN_ROLES: readonly UserRole[] = ['ROLE_ADMIN'];

export const PET_VIEW_ROLES: readonly UserRole[] = [
      'ROLE_ADMIN',
      'ROLE_VETERINARIAN',
      'ROLE_RECEPTIONIST',
      'ROLE_CLIENT',
    ];

    export const PET_WRITE_ROLES: readonly UserRole[] = [
      'ROLE_ADMIN',
      'ROLE_RECEPTIONIST',
      'ROLE_CLIENT',
    ];

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}
