import { SetMetadata } from '@nestjs/common';
/** Roles: ADMIN, STOREKEEPER, ENGINEER, MANAGEMENT (accounts) and GUEST (general loan, no account). */
export type AppRole = 'ADMIN' | 'STOREKEEPER' | 'ENGINEER' | 'MANAGEMENT' | 'GUEST';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
