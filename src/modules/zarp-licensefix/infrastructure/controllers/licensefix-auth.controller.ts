import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ActivateAccountUseCase } from '../../application/use-cases/activate-account.use-case';
import { LoginCustomerUseCase } from '../../application/use-cases/login-customer.use-case';
import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import { ActivateAccountDto } from '../../application/dtos/activate-account.dto';
import { LoginLicensefixDto } from '../../application/dtos/login-licensefix.dto';
import { ForgotPasswordDto } from '../../application/dtos/forgot-password.dto';
import { ResetPasswordDto } from '../../application/dtos/reset-password.dto';

@Controller('licensefix/auth')
export class LicensefixAuthController {
  constructor(
    private readonly activateAccountUseCase: ActivateAccountUseCase,
    private readonly loginCustomerUseCase: LoginCustomerUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  @Post('activate')
  @HttpCode(200)
  async activate(@Res() res: Response, @Body() body: ActivateAccountDto) {
    await this.activateAccountUseCase.execute(body.token, body.password);
    return res.status(200).json({ message: 'Senha criada com sucesso.' });
  }

  @Post('login')
  @HttpCode(200)
  async login(@Res() res: Response, @Body() body: LoginLicensefixDto) {
    const { token, ...data } = await this.loginCustomerUseCase.execute(body.tenant_id, body.email, body.password);

    res.cookie('licensefix_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.status(200).json(data);
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Res() res: Response, @Body() body: ForgotPasswordDto) {
    await this.forgotPasswordUseCase.execute(body.email, body.tenant_id);
    return res.status(200).json({ message: 'Se o email existir, você receberá as instruções em breve.' });
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Res() res: Response, @Body() body: ResetPasswordDto) {
    await this.resetPasswordUseCase.execute(body.token, body.password);
    return res.status(200).json({ message: 'Senha redefinida com sucesso.' });
  }
}
