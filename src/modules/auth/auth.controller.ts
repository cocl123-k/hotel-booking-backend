import { Controller, Post, Body, Patch, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RegisterPartnerDto } from './dto/register-partner.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('partner/register')
  registerPartner(@Body() registerPartnerDto: RegisterPartnerDto) {
    return this.authService.registerPartner(registerPartnerDto);
  }

  @Patch('change-password')
  @UseGuards(AuthGuard('jwt'))
  changePassword(
    @CurrentUser() user: any, 
    @Body() dto: ChangePasswordDto
  ) {
    const userId = user.id || user.sub;
    return this.authService.changePassword(userId, dto);
  }
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
  @Post('guest/send-otp')
  sendGuestOtp(@Body('email') email: string) {
    return this.authService.sendGuestOtp(email);
  }

  @Post('guest/verify-otp')
  verifyGuestOtp(@Body() body: { email: string, otp: string }) {
    return this.authService.verifyGuestOtp(body.email, body.otp);
  }
}