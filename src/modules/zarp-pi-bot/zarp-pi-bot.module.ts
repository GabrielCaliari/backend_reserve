import { Module } from '@nestjs/common';
import { ZarpAuthModule } from '@/modules/zarp-auth/zarp-auth.module';
import { PiBotService } from './application/services/pi-bot.service';
import { PiBotController } from './infrastructure/controllers/pi-bot.controller';

// Local repositories
import AdditionalTokenPackRepository from './infrastructure/repositories/additional-token-pack.repository';

// DIP tokens
import { ADDITIONAL_TOKEN_PACK_REPOSITORY } from './domain/interfaces';

/**
 * Zarp PI Bot Module
 * Bounded context: AI-powered brand analysis bot
 * Route prefix: /api/pi-bot
 */
@Module({
  imports: [ZarpAuthModule],
  controllers: [PiBotController],
  providers: [
    // Application services
    PiBotService,

    // Local repositories
    AdditionalTokenPackRepository,

    // DIP repository tokens
    { provide: ADDITIONAL_TOKEN_PACK_REPOSITORY, useExisting: AdditionalTokenPackRepository },
  ],
  exports: [
    PiBotService,
    // Concrete repos (backward compat)
    AdditionalTokenPackRepository,
    // DIP tokens
    ADDITIONAL_TOKEN_PACK_REPOSITORY,
  ],
})
export class ZarpPiBotModule {}
