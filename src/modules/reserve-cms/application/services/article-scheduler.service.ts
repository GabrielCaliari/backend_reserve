import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ArticleService } from './article.service';

@Injectable()
export class ArticleSchedulerService {
  private readonly logger = new Logger(ArticleSchedulerService.name);

  constructor(private readonly articleService: ArticleService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledArticles(): Promise<void> {
    this.logger.log('Running scheduled article publication check');
    await this.articleService.publishScheduledArticles();
  }
}
