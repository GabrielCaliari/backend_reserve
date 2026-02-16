import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';

// Shared modules
import { DatabaseModule } from './shared/database/database.module';
import { AuthModule } from './shared/auth/auth.module';

// Bounded Context modules
import { ZarpAuthModule } from './modules/zarp-auth/zarp-auth.module';
import { ZarpBrandsModule } from './modules/zarp-brands/zarp-brands.module';
import { ZarpCnpjsModule } from './modules/zarp-cnpjs/zarp-cnpjs.module';
import { ZarpJournalsModule } from './modules/zarp-journals/zarp-journals.module';
import { ZarpMailerModule } from './modules/zarp-mailer/zarp-mailer.module';
import { ZarpPiBotModule } from './modules/zarp-pi-bot/zarp-pi-bot.module';
import { ZarpCmsModule } from './modules/zarp-cms/zarp-cms.module';

// Shared pipes
import { ToLowercaseQueryParamsPipe, ToLowercaseBodyRequestPipe } from './shared/pipes';

@Module({
  imports: [
    // Global shared modules
    DatabaseModule,
    AuthModule,
    ScheduleModule.forRoot(),

    // Bounded Contexts
    ZarpAuthModule,
    ZarpBrandsModule,
    ZarpCnpjsModule,
    ZarpJournalsModule,
    ZarpMailerModule,
    ZarpPiBotModule,
    ZarpCmsModule,

    // Route prefixes per bounded context
    RouterModule.register([

      {
        path: 'brands',
        module: ZarpBrandsModule,
      },
      {
        path: 'cnpjs',
        module: ZarpCnpjsModule,
      },
      {
        path: 'journals',
        module: ZarpJournalsModule,
      },
      {
        path: 'mailer',
        module: ZarpMailerModule,
      },
      {
        path: 'pi-bot',
        module: ZarpPiBotModule,
      },
      {
        path: 'cms',
        module: ZarpCmsModule,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    ToLowercaseQueryParamsPipe,
    ToLowercaseBodyRequestPipe,
  ],
})
export class AppModule {}
