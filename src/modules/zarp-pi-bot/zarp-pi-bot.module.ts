import { Module } from '@nestjs/common';
import { ZarpAuthModule } from '@/modules/zarp-auth/zarp-auth.module';
import { PiBotService } from './application/services/pi-bot.service';
import { PiBotController } from './infrastructure/controllers/pi-bot.controller';

// Local repositories
import AdditionalTokenPackRepository from './infrastructure/repositories/additional-token-pack.repository';

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
  ],
  exports: [PiBotService],
})
export class ZarpPiBotModule {}
