import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';

// Interfaces
import { ACTIVATION_TOKEN_REPOSITORY } from './domain/interfaces/activation-token.repository.interface';
import { CUSTOMER_REPOSITORY } from './domain/interfaces/customer.repository.interface';
import { PRACTICE_EXAM_REPOSITORY } from './domain/interfaces/practice-exam.repository.interface';
import { QUESTION_REPOSITORY } from './domain/interfaces/question.repository.interface';
import { EXAM_ATTEMPT_REPOSITORY } from './domain/interfaces/exam-attempt.repository.interface';

// Repositories
import { PrismaActivationTokenRepository } from './infrastructure/repositories/prisma-activation-token.repository';
import { PrismaCustomerRepository } from './infrastructure/repositories/prisma-customer.repository';
import { PrismaPracticeExamRepository } from './infrastructure/repositories/prisma-practice-exam.repository';
import { PrismaQuestionRepository } from './infrastructure/repositories/prisma-question.repository';
import { PrismaExamAttemptRepository } from './infrastructure/repositories/prisma-exam-attempt.repository';
import { CustomerSessionTokenRepository } from './infrastructure/repositories/customer-session-token.repository';

// Providers
import { SesEmailProvider } from './infrastructure/providers/ses-email.provider';
import { CustomerTokenValidator, CUSTOMER_TOKEN_VALIDATOR } from './infrastructure/providers/customer-token-validator.provider';

// Use Cases
import { SendActivationEmailUseCase } from './application/use-cases/send-activation-email.use-case';
import { ActivateAccountUseCase } from './application/use-cases/activate-account.use-case';
import { LoginCustomerUseCase } from './application/use-cases/login-customer.use-case';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { PracticeExamAdminUseCase } from './application/use-cases/practice-exam-admin.use-case';
import { ExamAttemptUseCase } from './application/use-cases/exam-attempt.use-case';
import { CustomerOverviewUseCase } from './application/use-cases/customer-overview.use-case';

// Controllers
import { LicensefixAuthController } from './infrastructure/controllers/licensefix-auth.controller';
import { PracticeExamAdminController } from './infrastructure/controllers/practice-exam-admin.controller';
import { ExamAttemptController } from './infrastructure/controllers/exam-attempt.controller';
import { CustomerOverviewController } from './infrastructure/controllers/customer-overview.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [
    LicensefixAuthController,
    PracticeExamAdminController,
    ExamAttemptController,
    CustomerOverviewController,
  ],
  providers: [
    // Repositories
    { provide: ACTIVATION_TOKEN_REPOSITORY, useClass: PrismaActivationTokenRepository },
    { provide: CUSTOMER_REPOSITORY, useClass: PrismaCustomerRepository },
    { provide: PRACTICE_EXAM_REPOSITORY, useClass: PrismaPracticeExamRepository },
    { provide: QUESTION_REPOSITORY, useClass: PrismaQuestionRepository },
    { provide: EXAM_ATTEMPT_REPOSITORY, useClass: PrismaExamAttemptRepository },
    CustomerSessionTokenRepository,

    // Providers
    SesEmailProvider,
    { provide: CUSTOMER_TOKEN_VALIDATOR, useClass: CustomerTokenValidator },

    // Use Cases
    SendActivationEmailUseCase,
    ActivateAccountUseCase,
    LoginCustomerUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    PracticeExamAdminUseCase,
    ExamAttemptUseCase,
    CustomerOverviewUseCase,
  ],
  exports: [
    SendActivationEmailUseCase,
    CUSTOMER_REPOSITORY,
    CUSTOMER_TOKEN_VALIDATOR,
    CustomerSessionTokenRepository,
  ],
})
export class ZarpLicensefixModule {}
