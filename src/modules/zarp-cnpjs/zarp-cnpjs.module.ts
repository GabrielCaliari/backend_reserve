import { Module } from '@nestjs/common';
import { ZarpAuthModule } from '@/modules/zarp-auth/zarp-auth.module';
import { CnaeService } from './application/services/cnae.service';
import { CnaeController } from './infrastructure/controllers/cnae.controller';
import { CompanyService } from './application/services/company.service';
import { CompanyController } from './infrastructure/controllers/company.controller';

// Local repositories
import CnaeRepository from './infrastructure/repositories/cnae.repository';
import CompanyRepository from './infrastructure/repositories/company.repository';
import SearchRepository from './infrastructure/repositories/search.repository';

// DIP tokens
import {
  COMPANY_REPOSITORY,
  CNAE_REPOSITORY,
  SEARCH_REPOSITORY,
} from './domain/interfaces';

// Cross-context repositories (temporary coupling)
import UserRepository from '@/modules/zarp-auth/infrastructure/repositories/user.repository';

/**
 * Zarp CNPJs Module
 * Bounded context: CNPJ lookup, company data, CNAE codes
 * Route prefix: /api/cnpjs
 */
@Module({
  imports: [ZarpAuthModule],
  controllers: [
    CnaeController,
    CompanyController,
  ],
  providers: [
    // Application services
    CnaeService,
    CompanyService,

    // Local repositories
    CnaeRepository,
    CompanyRepository,
    SearchRepository,

    // DIP repository tokens
    { provide: COMPANY_REPOSITORY, useExisting: CompanyRepository },
    { provide: CNAE_REPOSITORY, useExisting: CnaeRepository },
    { provide: SEARCH_REPOSITORY, useExisting: SearchRepository },

    // Cross-context repositories (temporary coupling)
    UserRepository,
  ],
  exports: [
    CnaeService,
    CompanyService,
    // Concrete repos (backward compat)
    CnaeRepository,
    CompanyRepository,
    SearchRepository,
    // DIP tokens
    COMPANY_REPOSITORY,
    CNAE_REPOSITORY,
    SEARCH_REPOSITORY,
  ],
})
export class ZarpCnpjsModule {}
