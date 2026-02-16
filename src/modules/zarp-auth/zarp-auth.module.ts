import { Module } from '@nestjs/common';
import { AdminService } from './application/services/admin.service';
import { AdminController } from './infrastructure/controllers/admin.controller';
import { UserService } from './application/services/user.service';
import { UserController } from './infrastructure/controllers/user.controller';
import { EmailService } from './application/services/admin-email.service';
import { EmailController } from './infrastructure/controllers/admin-email.controller';
import { LeadService } from './application/services/admin-lead.service';
import { LeadController } from './infrastructure/controllers/admin-lead.controller';
import { PostService as AdminPostService } from './application/services/admin-post.service';
import { PostController as AdminPostController } from './infrastructure/controllers/admin-post.controller';

// Legacy repositories (will be replaced by DIP interfaces incrementally)
import AdminRepository from './infrastructure/repositories/admin.repository';
import AdminCredentialRepository from './infrastructure/repositories/admin-credential.repository';
import AdminSessionTokenRepository from './infrastructure/repositories/admin-session-token.repository';
import UserRepository from './infrastructure/repositories/user.repository';
import UserCredentialRepository from './infrastructure/repositories/user-credential.repository';
import UserSessionTokenRepository from './infrastructure/repositories/user-session-token.repository';
import LeadRepository from './infrastructure/repositories/lead.repository';
import LeadQualificationMessageRepository from './infrastructure/repositories/lead-qualification-message.repository';
import PlanRepository from './infrastructure/repositories/plan.repository';

// DIP tokens
import {
  ADMIN_REPOSITORY,
  ADMIN_CREDENTIAL_REPOSITORY,
  ADMIN_SESSION_TOKEN_REPOSITORY,
  USER_REPOSITORY,
  USER_CREDENTIAL_REPOSITORY,
  USER_SESSION_TOKEN_REPOSITORY,
  LEAD_REPOSITORY,
  PLAN_REPOSITORY,
} from './domain/interfaces';

// Cross-context repositories (temporary, to be replaced by module imports)
import SearchRepository from '@/modules/zarp-cnpjs/infrastructure/repositories/search.repository';
import BrandRepository from '@/modules/zarp-brands/infrastructure/repositories/brand.repository';
import BrandAlertRepository from '@/modules/zarp-brands/infrastructure/repositories/brand-alert.repository';
import BrandAnalysisRepository from '@/modules/zarp-brands/infrastructure/repositories/brand-analysis.repository';
import AdditionalTokenPackRepository from '@/modules/zarp-pi-bot/infrastructure/repositories/additional-token-pack.repository';
import APITokenRepository from '@/modules/zarp-brands/infrastructure/repositories/api-token.repository';

// DIP Guards
import { AdminJwtGuard, UserJwtGuard } from '@/shared/auth/guards';
import { ADMIN_TOKEN_VALIDATOR, USER_TOKEN_VALIDATOR } from '@/shared/auth/interfaces/token-validator.interface';

// Token Validators (ITokenValidator implementations)
import { AdminTokenValidator } from './infrastructure/providers/admin-token-validator.provider';
import { UserTokenValidator } from './infrastructure/providers/user-token-validator.provider';

// Providers
import { FXGoogleAPITokenProvider } from '@/modules/zarp-auth/infrastructure/providers/fx-google-api-token.provider';

/**
 * Zarp Auth Module
 * Bounded context: Admin & User authentication, sessions, JWT
 * Route prefix: /api/auth
 */
@Module({
  controllers: [
    AdminController,
    UserController,
    EmailController,
    LeadController,
    AdminPostController,
  ],
  providers: [
    // Application services
    AdminService,
    UserService,
    EmailService,
    LeadService,
    AdminPostService,

    // Token Validators (DIP implementations)
    AdminTokenValidator,
    UserTokenValidator,
    { provide: ADMIN_TOKEN_VALIDATOR, useExisting: AdminTokenValidator },
    { provide: USER_TOKEN_VALIDATOR, useExisting: UserTokenValidator },

    // DIP Guards
    AdminJwtGuard,
    UserJwtGuard,

    // Local repositories
    AdminRepository,
    AdminCredentialRepository,
    AdminSessionTokenRepository,
    UserRepository,
    UserCredentialRepository,
    UserSessionTokenRepository,
    LeadRepository,
    LeadQualificationMessageRepository,
    PlanRepository,

    // DIP repository tokens (alias to concrete repos)
    { provide: ADMIN_REPOSITORY, useExisting: AdminRepository },
    { provide: ADMIN_CREDENTIAL_REPOSITORY, useExisting: AdminCredentialRepository },
    { provide: ADMIN_SESSION_TOKEN_REPOSITORY, useExisting: AdminSessionTokenRepository },
    { provide: USER_REPOSITORY, useExisting: UserRepository },
    { provide: USER_CREDENTIAL_REPOSITORY, useExisting: UserCredentialRepository },
    { provide: USER_SESSION_TOKEN_REPOSITORY, useExisting: UserSessionTokenRepository },
    { provide: LEAD_REPOSITORY, useExisting: LeadRepository },
    { provide: PLAN_REPOSITORY, useExisting: PlanRepository },

    // Cross-context repositories (temporary coupling)
    SearchRepository,
    BrandRepository,
    BrandAlertRepository,
    BrandAnalysisRepository,
    AdditionalTokenPackRepository,
    APITokenRepository,

    // Providers
    FXGoogleAPITokenProvider,
  ],
  exports: [
    AdminService,
    AdminJwtGuard,
    UserJwtGuard,
    ADMIN_TOKEN_VALIDATOR,
    USER_TOKEN_VALIDATOR,
    // Concrete repos (backward compat for cross-context consumers)
    AdminRepository,
    AdminCredentialRepository,
    AdminSessionTokenRepository,
    UserRepository,
    UserCredentialRepository,
    UserSessionTokenRepository,
    LeadRepository,
    PlanRepository,
    // DIP tokens
    ADMIN_REPOSITORY,
    ADMIN_CREDENTIAL_REPOSITORY,
    ADMIN_SESSION_TOKEN_REPOSITORY,
    USER_REPOSITORY,
    USER_CREDENTIAL_REPOSITORY,
    USER_SESSION_TOKEN_REPOSITORY,
    LEAD_REPOSITORY,
    PLAN_REPOSITORY,
    UserService,
  ],
})
export class ZarpAuthModule {}
