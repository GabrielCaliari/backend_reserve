import { Module } from '@nestjs/common';
import { JournalAlertController } from './modules/journal-alert/journal-alert.controller';
import { JournalAlertService } from './modules/journal-alert/journal-alert.service';
import { UserService } from './modules/user/user.service';
import { UserValidateJwtTokenGuard } from './common/guards/user-validate-jwt-token/user-validate-jwt-token.guard';
import { UserController } from './modules/user/user.controller';
import UserCredentialRepository from './core/database/repository/user-credential.repository';
import UserRepository from './core/database/repository/user.repository';
import UserSessionTokenRepository from './core/database/repository/user-session-token.repository';
import { ToLowercaseQueryParamsPipe } from './common/pipe/to-lowercase-query-params/to-lowercase-query-params.pipe';
import { ToLowercaseBodyRequestPipe } from './common/pipe/to-lowercase-body-request/to-lowercase-body-request.pipe';
import { CompanyController } from './modules/company/company.controller';
import { CompanyService } from './modules/company/company.service';
import { JournalController } from './modules/journal/journal.controller';
import { JournalService } from './modules/journal/journal.service';
import { CnaeController } from './modules/cnae/cnae.controller';
import { CnaeService } from './modules/cnae/cnae.service';
import { BrandController } from './modules/brand/brand.controller';
import { BrandService } from './modules/brand/brand.service';
import CompanyRepository from './core/database/repository/company.repository';
import JournalRepository from './core/database/repository/journal.repository';
import JournalToFetchRepository from './core/database/repository/journal-to-fetch.repository';
import SearchRepository from './core/database/repository/search.repository';
import CnaeRepository from './core/database/repository/cnae.repository';
import BrandRepository from './core/database/repository/brand.repository';
import JournalAlertRepository from './core/database/repository/journal-alert.repository';
import BrandMonitoringRepository from './core/database/repository/brand-monitoring.repository';
import BrandNotificationRepository from './core/database/repository/brand-notification.repository';
import { ScheduleModule } from '@nestjs/schedule';
import { BrandAnalysisController } from './modules/brand-analysis/brand-analysis.controller';
import { BrandAnalysisService } from './modules/brand-analysis/brand-analysis.service';
import PlanRepository from './core/database/repository/plan.repository';
import BrandAlertRepository from './core/database/repository/brand-alert.repository';
import BrandAnalysisRepository from './core/database/repository/brand-analysis.repository';
import { AppController } from './app.controller';
import { PiBotController } from './modules/pi-bot/pi-bot.controller';
import { PiBotService } from './modules/pi-bot/pi-bot.service';
import { PostController } from './modules/post/post.controller';
import { PostService } from './modules/post/post.service';
import { AdminController } from './modules/admin/admin.controller';
import { AdminService } from './modules/admin/admin.service';
import AdditionalTokenPackRepository from './core/database/repository/additional-token-pack.repository';
import PublicBrandSearchRepository from './core/database/repository/public-brand-search.repository';
import EuipoAPIToken from './core/providers/implementations/Euipo.apitoken';
import APITokenRepository from './core/database/repository/api-token.repository';
import AESEncrypt from './core/providers/AESEncrypt';
import LeadRepository from './core/database/repository/lead.repository';
import AdminSessionTokenRepository from './core/database/repository/admin-session-token.repository';
import AdminCredentialRepository from './core/database/repository/admin-credential.repository';
import AdminRepository from './core/database/repository/admin.repository';
import { AdminValidateJwtTokenGuard } from './common/guards/admin-validate-jwt-token/admin-validate-jwt-token.guard';
import { LeadController } from './modules/admin/lead/lead.controller';
import { LeadService } from './modules/admin/lead/lead.service';
import LeadQualificationMessageRepository from './core/database/repository/lead-qualification-message.repository';

@Module({
  imports: [
    ScheduleModule.forRoot()
  ],
  controllers: [
    JournalAlertController,
    UserController,
    CompanyController,
    JournalController,
    CnaeController,
    BrandController,
    BrandAnalysisController,
    AppController,
    PiBotController,
    PostController,
    AdminController,
    LeadController
  ],
  providers: [
    JournalAlertService,
    UserService,
    UserValidateJwtTokenGuard,
    UserCredentialRepository,
    UserRepository,
    UserSessionTokenRepository,
    ToLowercaseQueryParamsPipe,
    ToLowercaseBodyRequestPipe,
    CompanyService,
    CompanyRepository,
    JournalService,
    JournalRepository,
    JournalToFetchRepository,
    SearchRepository,
    CnaeService,
    CnaeRepository,
    BrandService,
    BrandRepository,
    JournalAlertRepository,
    BrandMonitoringRepository,
    BrandNotificationRepository,
    PlanRepository,
    BrandAlertRepository,
    BrandAnalysisService,
    BrandAnalysisRepository,
    PiBotService,
    AdditionalTokenPackRepository,
    PublicBrandSearchRepository,
    PostService,
    EuipoAPIToken,
    APITokenRepository,
    AESEncrypt,
    AdminService,
    AdminSessionTokenRepository,
    AdminCredentialRepository,
    AdminRepository,
    AdminValidateJwtTokenGuard,
    LeadService,
    LeadRepository,
    LeadQualificationMessageRepository
  ],
})
export class AppModule {}
