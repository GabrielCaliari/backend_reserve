import { Module } from '@nestjs/common';
import { JournalAlertController } from './modules/v1/journal-alert/journal-alert.controller';
import { JournalAlertService } from './modules/v1/journal-alert/journal-alert.service';
import { UserService } from './modules/v1/user/user.service';
import { UserValidateJwtTokenGuard } from './common/guards/user-validate-jwt-token/user-validate-jwt-token.guard';
import { UserController } from './modules/v1/user/user.controller';
import UserCredentialRepository from './core/database/repository/user-credential.repository';
import UserRepository from './core/database/repository/user.repository';
import UserSessionTokenRepository from './core/database/repository/user-session-token.repository';
import { ToLowercaseQueryParamsPipe } from './common/pipe/to-lowercase-query-params/to-lowercase-query-params.pipe';
import { ToLowercaseBodyRequestPipe } from './common/pipe/to-lowercase-body-request/to-lowercase-body-request.pipe';
import { CompanyController } from './modules/v1/company/company.controller';
import { CompanyService } from './modules/v1/company/company.service';
import { JournalController } from './modules/v1/journal/journal.controller';
import { JournalService } from './modules/v1/journal/journal.service';
import { CnaeController } from './modules/v1/cnae/cnae.controller';
import { CnaeService } from './modules/v1/cnae/cnae.service';
import { BrandController } from './modules/v1/brand/brand.controller';
import { BrandService } from './modules/v1/brand/brand.service';
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
import { BrandAnalysisController } from './modules/v1/brand-analysis/brand-analysis.controller';
import { BrandAnalysisService } from './modules/v1/brand-analysis/brand-analysis.service';
import PlanRepository from './core/database/repository/plan.repository';
import BrandAlertRepository from './core/database/repository/brand-alert.repository';
import BrandAnalysisRepository from './core/database/repository/brand-analysis.repository';
import { AppController } from './app.controller';
import { PiBotController } from './modules/v1/pi-bot/pi-bot.controller';
import { PiBotService } from './modules/v1/pi-bot/pi-bot.service';
import { PostController } from './modules/v1/post/post.controller';
import { PostService } from './modules/v1/post/post.service';
import { AdminController } from './modules/v1/admin/admin.controller';
import { AdminService } from './modules/v1/admin/admin.service';
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
import { LeadController } from './modules/v1/admin/lead/lead.controller';
import { LeadService } from './modules/v1/admin/lead/lead.service';
import { PostController as AdminPostController } from './modules/v1/admin/post/post.controller';
import { PostService as AdminPostService } from './modules/v1/admin/post/post.service';
import { EmailController } from './modules/v1/admin/email/email.controller';
import { EmailService } from './modules/v1/admin/email/email.service';
import LeadQualificationMessageRepository from './core/database/repository/lead-qualification-message.repository';
import FXGoogleAPIToken from './core/providers/implementations/FXGoogle.apitoken';
import { RouterModule } from '@nestjs/core';
import { V2Module } from './modules/v2/v2.module';
import { EventNotificationModule } from './modules/v2/event-notification/event-notification.module';
import { LeadModule } from './modules/v2/lead/lead.module';
import { BullModule } from '@nestjs/bull';
import { env } from './core/functions';
import { EmailCampaignModule } from './modules/v2/email-campaign/email-campaign.module';
import { EmailCampaignProcess } from './modules/v2/email-campaign/email-campaign.process';
import EmailCampaignRepository from './core/database/repository/email-campaign.repository';
import CampaignBatchRepository from './core/database/repository/campaign-batch.repository';
import { DeliveryRepository } from './core/database/repository/delivery.repository';
import SMTPServerRepository from './core/database/repository/smtp-server.repository';
import { ConfigModule } from './modules/v2/config/config.module';

@Module({
  imports: [
    V2Module,
    EventNotificationModule,
    LeadModule,
    EmailCampaignModule,
    ConfigModule,
    RouterModule.register([
      {
        path: 'v2',
        module: V2Module,
        children: [
          {
            path: 'event-notification',
            module: EventNotificationModule,
          },
          {
            path: 'lead',
            module: LeadModule
          },
          {
            path: 'email-campaign',
            module: EmailCampaignModule
          },
          {
            path: 'config',
            module: ConfigModule
          }
        ]
      },
    ]),
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
    LeadController,
    AdminPostController,
    EmailController
  ],
  providers: [
    JournalAlertService,
    UserService,
    UserValidateJwtTokenGuard,
    UserCredentialRepository,
    UserRepository,
    UserSessionTokenRepository,
    EmailCampaignRepository,
    CampaignBatchRepository,
    DeliveryRepository,
    SMTPServerRepository,
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
    LeadQualificationMessageRepository,
    AdminPostService,
    EmailService,
    FXGoogleAPIToken,
  ],
  exports: [
    AdminValidateJwtTokenGuard,
    AdminService,
    AdminRepository,
    AdminCredentialRepository,
    AdminSessionTokenRepository
  ]
})
export class AppModule { }
