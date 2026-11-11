import { SetMetadata } from '@nestjs/common';
/** Roles: ADMIN, STOREKEEPER, ENGINEER, MANAGEMENT (accounts) and GUEST (general loan, no account). */
export type AppRole = 'ADMIN' | 'STOREKEEPER' | 'ENGINEER' | 'MANAGEMENT' | 'GUEST';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Like @Roles, but Admin does NOT automatically get access.
 * Use only where a feature is deliberately restricted to a specific role
 * (e.g. Send reminder: Storekeeper only).
 */
export const STRICT_ROLES_KEY = 'strictRoles';
export const StrictRoles = (...roles: AppRole[]) => SetMetadata(STRICT_ROLES_KEY, roles);
