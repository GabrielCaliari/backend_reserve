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

// DIP tokens
import {
  JOURNAL_REPOSITORY,
  JOURNAL_TO_FETCH_REPOSITORY,
  JOURNAL_ALERT_REPOSITORY,
} from './domain/interfaces';

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

    // DIP repository tokens
    { provide: JOURNAL_REPOSITORY, useExisting: JournalRepository },
    { provide: JOURNAL_ALERT_REPOSITORY, useExisting: JournalAlertRepository },
    { provide: JOURNAL_TO_FETCH_REPOSITORY, useExisting: JournalToFetchRepository },
  ],
  exports: [
    JournalService,
    JournalAlertService,
    // Concrete repos (backward compat)
    JournalRepository,
    JournalAlertRepository,
    JournalToFetchRepository,
    // DIP tokens
    JOURNAL_REPOSITORY,
    JOURNAL_ALERT_REPOSITORY,
    JOURNAL_TO_FETCH_REPOSITORY,
  ],
})
export class ZarpJournalsModule {}
