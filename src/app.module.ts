import { Module } from '@nestjs/common';
import { JournalAlertController } from './modules/journal-alert/journal-alert.controller';
import { JournalAlertService } from './modules/journal-alert/journal-alert.service';
import { UserService } from './modules/user/user.service';
import { UserValidateJwtTokenGuard } from './common/guards/user-validate-jwt-token/user-validate-jwt-token.guard';
import { UserController } from './modules/user/user.controller';
import UserCredentialRepository from './modules/user/user-credential.repository';
import UserRepository from './modules/user/user.repository';
import UserSessionTokenRepository from './modules/user/user-session-token.repository';
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
import CompanyRepository from './modules/company/company.repository';
import JournalRepository from './modules/journal/journal.repository';
import JournalToFetchRepository from './modules/journal/journal-to-fetch.repository';
import SearchRepository from './modules/company/search.repository';
import CnaeRepository from './modules/cnae/cnae.repository';
import BrandRepository from './modules/brand/brand.repository';
import JournalAlertRepository from './modules/brand/journal-alert.repository';
import BrandMonitoringRepository from './modules/brand/brand-monitoring.repository';
import BrandNotificationRepository from './modules/brand/brand-notification.repository';
import { ScheduleModule } from '@nestjs/schedule';
import { BrandAnalysisController } from './modules/brand-analysis/brand-analysis.controller';
import { BrandAnalysisService } from './modules/brand-analysis/brand-analysis.service';
import PlanRepository from './modules/user/plan.repository';
import BrandAlertRepository from './modules/brand/brand-alert.repository';
import BrandAnalysisRepository from './modules/brand-analysis/brand-analysis.repository';
import { AppController } from './app.controller';
import { PiBotController } from './modules/pi-bot/pi-bot.controller';
import { PiBotService } from './modules/pi-bot/pi-bot.service';
import { PostController } from './modules/post/post.controller';
import { PostService } from './modules/post/post.service';
import AdditionalTokenPackRepository from './modules/user/additional-token-pack.repository';
import PublicBrandSearchRepository from './modules/brand/public-brand-search.repository';

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
    PostController
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
    PostService
  ],
})
export class AppModule {}
