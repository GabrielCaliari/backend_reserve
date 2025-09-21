import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { JournalService } from './journal.service';
import { Response } from 'express';
import SyncQueryParamsValidator from 'src/common/validators/journal/Sync-query-params.validator';

@Controller('journal')
export class JournalController {
    constructor(
        private readonly journalService: JournalService
    ) { }

    @Post('/sync')
    async sync(
        @Res() res: Response,
        @Body() data: SyncQueryParamsValidator
    ) {
        const result = await this.journalService.sync(data.init, data.limit);
        return res.status(result.status).json(result.data);
    }

    @Get('/sync-fetch')
    async syncFetch(
        @Res() res: Response,
    ) {
        const result = await this.journalService.syncJournal();
        return res.status(result.status).json(result.data);
    }
}
