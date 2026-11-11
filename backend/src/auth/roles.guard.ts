import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, STRICT_ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest().user;
    const strict = this.reflector.getAllAndOverride<string[]>(STRICT_ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (strict && strict.length > 0) return !!user && strict.includes(user.role);
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!roles || roles.length === 0) return true;
    return !!user && (user.role === 'ADMIN' || roles.includes(user.role));
  }
}
