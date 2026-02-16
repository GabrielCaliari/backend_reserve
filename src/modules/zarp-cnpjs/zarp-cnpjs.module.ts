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

    // Cross-context repositories (temporary coupling)
    UserRepository,
  ],
  exports: [
    CnaeService,
    CompanyService,
    CnaeRepository,
    CompanyRepository,
  ],
})
export class ZarpCnpjsModule {}
