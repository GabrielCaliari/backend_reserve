import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';

import { ACTIVATION_TOKEN_REPOSITORY } from './domain/interfaces/activation-token.repository.interface';
import { CUSTOMER_REPOSITORY } from './domain/interfaces/customer.repository.interface';
import { PrismaActivationTokenRepository } from './infrastructure/repositories/prisma-activation-token.repository';
import { PrismaCustomerRepository } from './infrastructure/repositories/prisma-customer.repository';
import { SesEmailProvider } from './infrastructure/providers/ses-email.provider';
import { CustomerSessionTokenRepository } from './infrastructure/repositories/customer-session-token.repository';
import { CustomerTokenValidator, CUSTOMER_TOKEN_VALIDATOR } from './infrastructure/providers/customer-token-validator.provider';

import { SendActivationEmailUseCase } from './application/use-cases/send-activation-email.use-case';
import { ActivateAccountUseCase } from './application/use-cases/activate-account.use-case';
import { LoginCustomerUseCase } from './application/use-cases/login-customer.use-case';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';

import { LicensefixAuthController } from './infrastructure/controllers/licensefix-auth.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [LicensefixAuthController],
  providers: [
    { provide: ACTIVATION_TOKEN_REPOSITORY, useClass: PrismaActivationTokenRepository },
    { provide: CUSTOMER_REPOSITORY, useClass: PrismaCustomerRepository },
    SesEmailProvider,
    CustomerSessionTokenRepository,
    { provide: CUSTOMER_TOKEN_VALIDATOR, useClass: CustomerTokenValidator },
    SendActivationEmailUseCase,
    ActivateAccountUseCase,
    LoginCustomerUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
  ],
  exports: [SendActivationEmailUseCase, CUSTOMER_REPOSITORY, CUSTOMER_TOKEN_VALIDATOR, CustomerSessionTokenRepository],
})
export class ZarpLicensefixModule {}
