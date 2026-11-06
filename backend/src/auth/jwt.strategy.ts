import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: process.env.JWT_SECRET || 'dev-secret' });
  }
  validate(payload: any) {
    return { id: payload.sub, email: payload.email, fullName: payload.fullName, role: payload.role, guest: !!payload.guest };
  }
}
