import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

class LoginDto { @IsEmail() email: string; @IsString() password: string; }
class GuestDto { @IsString() @MinLength(2) name: string; @IsEmail() email: string; }

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto.email, dto.password); }
  /** Continue as guest (general loan) */
  @Post('guest') guest(@Body() dto: GuestDto) { return this.auth.guest(dto.name, dto.email); }
  @UseGuards(JwtAuthGuard) @Get('me') me(@Req() req) { return req.user; }
}
