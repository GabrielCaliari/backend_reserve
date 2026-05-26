import { Module } from '@nestjs/common';
import { ReserveCouponsModule } from '../reserve-coupons/reserve-coupons.module';
import { AdminCouponsController } from '../reserve-coupons/infrastructure/controllers/admin-coupons.controller';
import { AdminService } from './application/services/admin.service';
import { AdminController } from './infrastructure/controllers/admin.controller';
import { UserService } from './application/services/user.service';
import { UserController } from './infrastructure/controllers/user.controller';
import { EmailService } from './application/services/admin-email.service';
import { EmailController } from './infrastructure/controllers/admin-email.controller';
import { PostService as AdminPostService } from './application/services/admin-post.service';
import { PostController as AdminPostController } from './infrastructure/controllers/admin-post.controller';
import { TenantService } from './application/services/tenant.service';
import { TenantRetentionService } from './application/services/tenant-retention.service';
import { AdminRetentionService } from './application/services/admin-retention.service';
import { TenantController } from './infrastructure/controllers/tenant.controller';
import { UserManagementService } from './application/services/user-management.service';
import { AdminUserController } from './infrastructure/controllers/admin-user.controller';

// Legacy repositories (will be replaced by DIP interfaces incrementally)
import AdminRepository from './infrastructure/repositories/admin.repository';
import AdminCredentialRepository from './infrastructure/repositories/admin-credential.repository';
import AdminSessionTokenRepository from './infrastructure/repositories/admin-session-token.repository';
import UserRepository from './infrastructure/repositories/user.repository';
import UserCredentialRepository from './infrastructure/repositories/user-credential.repository';
import UserSessionTokenRepository from './infrastructure/repositories/user-session-token.repository';
import PlanRepository from './infrastructure/repositories/plan.repository';
import TenantRepository from './infrastructure/repositories/tenant.repository';
import AdminTenantRepository from './infrastructure/repositories/admin-tenant.repository';
import { UserCollectionRepository } from './infrastructure/repositories/user-collection.repository';
import { UserCollectionMembershipRepository } from './infrastructure/repositories/user-collection-membership.repository';

// DIP tokens
import {
  ADMIN_REPOSITORY,
  ADMIN_CREDENTIAL_REPOSITORY,
  ADMIN_SESSION_TOKEN_REPOSITORY,
  USER_REPOSITORY,
  USER_CREDENTIAL_REPOSITORY,
  USER_SESSION_TOKEN_REPOSITORY,
  PLAN_REPOSITORY,
  TENANT_REPOSITORY,
  ADMIN_TENANT_REPOSITORY,
  USER_COLLECTION_REPOSITORY,
  USER_COLLECTION_MEMBERSHIP_REPOSITORY,
} from './domain/interfaces';

// Cross-context repositories (temporary, to be replaced by module imports)
import SearchRepository from '../reserve-cnpjs/infrastructure/repositories/search.repository';
import BrandRepository from '../reserve-brands/infrastructure/repositories/brand.repository';
import BrandAlertRepository from '../reserve-brands/infrastructure/repositories/brand-alert.repository';
import BrandAnalysisRepository from '../reserve-brands/infrastructure/repositories/brand-analysis.repository';
import AdditionalTokenPackRepository from '../reserve-pi-bot/infrastructure/repositories/additional-token-pack.repository';
import APITokenRepository from '../reserve-brands/infrastructure/repositories/api-token.repository';

// DIP Guards
import { AdminJwtGuard, UserJwtGuard, RolesGuard, TenantGuard, UserTenantGuard, UserRolesGuard } from '../../shared/auth/guards';
import { ADMIN_TOKEN_VALIDATOR, USER_TOKEN_VALIDATOR } from '../../shared/auth/interfaces/token-validator.interface';

// Token Validators (ITokenValidator implementations)
import { AdminTokenValidator } from './infrastructure/providers/admin-token-validator.provider';
import { UserTokenValidator } from './infrastructure/providers/user-token-validator.provider';

// Providers
import { FXGoogleAPITokenProvider } from './infrastructure/providers/fx-google-api-token.provider';

/**
 * Reserve Auth Module
 * Bounded context: Admin & User authentication, sessions, JWT, RBAC, multi-tenant
 * Route prefix: /api/auth
 */
@Module({
  imports: [ReserveCouponsModule],
  controllers: [
    AdminUserController, // must be before AdminController to avoid /:id route conflict
    AdminCouponsController, // must be before AdminController to avoid /:id route conflict
    AdminController,
    UserController,
    EmailController,
    AdminPostController,
    TenantController,
  ],
  providers: [
    // Application services
    AdminService,
    UserService,
    EmailService,
    AdminPostService,
    TenantService,
    TenantRetentionService,
    AdminRetentionService,
    UserManagementService,

    // Token Validators (DIP implementations)
    AdminTokenValidator,
    UserTokenValidator,
    { provide: ADMIN_TOKEN_VALIDATOR, useExisting: AdminTokenValidator },
    { provide: USER_TOKEN_VALIDATOR, useExisting: UserTokenValidator },

    // DIP Guards
    AdminJwtGuard,
    UserJwtGuard,
    RolesGuard,
    TenantGuard,
    UserTenantGuard,
    UserRolesGuard,

    // Local repositories
    AdminRepository,
    AdminCredentialRepository,
    AdminSessionTokenRepository,
    UserRepository,
    UserCredentialRepository,
    UserSessionTokenRepository,
    PlanRepository,
    TenantRepository,
    AdminTenantRepository,
    UserCollectionRepository,
    UserCollectionMembershipRepository,

    // DIP repository tokens (alias to concrete repos)
    { provide: ADMIN_REPOSITORY, useExisting: AdminRepository },
    { provide: ADMIN_CREDENTIAL_REPOSITORY, useExisting: AdminCredentialRepository },
    { provide: ADMIN_SESSION_TOKEN_REPOSITORY, useExisting: AdminSessionTokenRepository },
    { provide: USER_REPOSITORY, useExisting: UserRepository },
    { provide: USER_CREDENTIAL_REPOSITORY, useExisting: UserCredentialRepository },
    { provide: USER_SESSION_TOKEN_REPOSITORY, useExisting: UserSessionTokenRepository },
    { provide: PLAN_REPOSITORY, useExisting: PlanRepository },
    { provide: TENANT_REPOSITORY, useExisting: TenantRepository },
    { provide: ADMIN_TENANT_REPOSITORY, useExisting: AdminTenantRepository },
    { provide: USER_COLLECTION_REPOSITORY, useExisting: UserCollectionRepository },
    { provide: USER_COLLECTION_MEMBERSHIP_REPOSITORY, useExisting: UserCollectionMembershipRepository },

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
    TenantService,
    AdminJwtGuard,
    UserJwtGuard,
    RolesGuard,
    TenantGuard,
    UserTenantGuard,
    UserRolesGuard,
    ADMIN_TOKEN_VALIDATOR,
    USER_TOKEN_VALIDATOR,
    // Concrete repos (backward compat for cross-context consumers)
    AdminRepository,
    AdminCredentialRepository,
    AdminSessionTokenRepository,
    UserRepository,
    UserCredentialRepository,
    UserSessionTokenRepository,
    PlanRepository,
    TenantRepository,
    AdminTenantRepository,
    UserCollectionRepository,
    UserCollectionMembershipRepository,
    // DIP tokens
    ADMIN_REPOSITORY,
    ADMIN_CREDENTIAL_REPOSITORY,
    ADMIN_SESSION_TOKEN_REPOSITORY,
    USER_REPOSITORY,
    USER_CREDENTIAL_REPOSITORY,
    USER_SESSION_TOKEN_REPOSITORY,
    PLAN_REPOSITORY,
    TENANT_REPOSITORY,
    ADMIN_TENANT_REPOSITORY,
    USER_COLLECTION_REPOSITORY,
    USER_COLLECTION_MEMBERSHIP_REPOSITORY,
    UserService,
  ],
})
export class ReserveAuthModule {}
