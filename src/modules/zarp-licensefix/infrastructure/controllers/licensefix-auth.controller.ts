import { Body, Controller, Headers, HttpCode, Post, Res, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { HashProvider } from '../../../../shared/providers/hash.provider';
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
    private readonly prisma: PrismaService,
    private readonly hashProvider: HashProvider,
  ) {}

  @Post('activate')
  @HttpCode(200)
  async activate(@Res() res: Response, @Body() body: ActivateAccountDto) {
    await this.activateAccountUseCase.execute(body.token, body.password);
    return res.status(200).json({ message: 'Password created successfully.' });
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
    return res.status(200).json({ message: 'If this email is registered, you will receive reset instructions shortly.' });
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Res() res: Response, @Body() body: ResetPasswordDto) {
    await this.resetPasswordUseCase.execute(body.token, body.password);
    return res.status(200).json({ message: 'Password reset successfully.' });
  }

  @Post('internal/seed-admin')
  @HttpCode(201)
  async seedAdmin(
    @Headers('x-internal-secret') secret: string,
    @Body() body: { tenant_id: string; email: string; name: string; password: string },
    @Res() res: Response,
  ) {
    if (secret !== process.env.INTERNAL_SEED_SECRET) {
      throw new UnauthorizedException('Invalid secret.');
    }

    const { hash, salt } = this.hashProvider.hash(body.password);

    const customer = await this.prisma.customer.upsert({
      where: { tenant_id_email: { tenant_id: body.tenant_id, email: body.email } },
      update: { role: 'admin' },
      create: { tenant_id: body.tenant_id, email: body.email, name: body.name, role: 'admin' },
    });

    await this.prisma.customerCredential.upsert({
      where: { customer_id: customer.id },
      update: { hash, salt },
      create: { customer_id: customer.id, hash, salt },
    });

    return res.status(201).json({ id: customer.id, email: customer.email, role: customer.role });
  }
}
