import { Module } from '@nestjs/common';
import { JournalService } from './application/services/journal.service';
import { JournalController } from './infrastructure/controllers/journal.controller';
import { JournalAlertService } from './application/services/journal-alert.service';
import { JournalAlertController } from './infrastructure/controllers/journal-alert.controller';
import { PostService } from './application/services/post.service';
import { PostController } from './infrastructure/controllers/post.controller';

// Local repositories
import JournalRepository from './infrastructure/repositories/journal.repository';
import JournalAlertRepository from './infrastructure/repositories/journal-alert.repository';
import JournalToFetchRepository from './infrastructure/repositories/journal-to-fetch.repository';

/**
 * Zarp Journals Module
 * Bounded context: Journal/publications, alerts, posts
 * Route prefix: /api/journals
 */
@Module({
  controllers: [
    JournalController,
    JournalAlertController,
    PostController,
  ],
  providers: [
    // Application services
    JournalService,
    JournalAlertService,
    PostService,

    // Local repositories
    JournalRepository,
    JournalAlertRepository,
    JournalToFetchRepository,
  ],
  exports: [
    JournalService,
    JournalAlertService,
    JournalRepository,
    JournalAlertRepository,
  ],
})
export class ZarpJournalsModule {}
