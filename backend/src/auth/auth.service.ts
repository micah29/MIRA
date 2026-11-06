import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}
  /**
   * General loan: people outside the engineering team continue as a guest with name + email.
   * No account is created; the token carries role GUEST and is valid for 8 hours.
   * The name/email is added to the People list so overdue reminders reach them.
   */
  async guest(name: string, email: string) {
    const fullName = name.trim().replace(/\s+/g, ' ');
    const mail = email.trim().toLowerCase();
    const person = await this.prisma.person.findFirst({ where: { name: { equals: fullName, mode: 'insensitive' } } });
    if (!person) await this.prisma.person.create({ data: { name: fullName, email: mail, section: 'Guest' } });
    else if (!person.email) await this.prisma.person.update({ where: { id: person.id }, data: { email: mail } });
    const payload = { sub: 0, email: mail, fullName, role: 'GUEST', guest: true };
    return { accessToken: await this.jwt.signAsync(payload), user: { id: 0, email: mail, fullName, role: 'GUEST' } };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    const payload = { sub: user.id, email: user.email, fullName: user.fullName, role: user.role };
    return { accessToken: await this.jwt.signAsync(payload), user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } };
  }
}
