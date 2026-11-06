import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

const ROLES = ['ADMIN', 'STOREKEEPER', 'ENGINEER', 'MANAGEMENT'];
class CreateUserDto { @IsEmail() email: string; @IsString() fullName: string; @IsIn(ROLES) role: any; @IsString() @MinLength(8) password: string; }
class UpdateUserDto { @IsOptional() @IsString() fullName?: string; @IsOptional() @IsIn(ROLES) role?: any; @IsOptional() @IsBoolean() active?: boolean; @IsOptional() @IsString() @MinLength(8) password?: string; }
const pub = { id: true, email: true, fullName: true, role: true, active: true, createdAt: true };

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}
  @Get() list() { return this.prisma.user.findMany({ select: pub, orderBy: { fullName: 'asc' } }); }
  @Post() async create(@Body() d: CreateUserDto) {
    return this.prisma.user.create({ data: { email: d.email.toLowerCase(), fullName: d.fullName, role: d.role, passwordHash: await bcrypt.hash(d.password, 10) }, select: pub });
  }
  @Patch(':id') async update(@Param('id', ParseIntPipe) id: number, @Body() d: UpdateUserDto) {
    const { password, ...rest } = d;
    return this.prisma.user.update({ where: { id }, data: { ...rest, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) }, select: pub });
  }
}
