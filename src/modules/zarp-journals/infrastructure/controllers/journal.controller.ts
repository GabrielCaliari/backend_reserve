import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { JournalService } from '../../application/services/journal.service';
import { Response } from 'express';
import SyncQueryParamsDTO from '@/modules/zarp-journals/application/dtos/sync-query-params.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Journal')
@Controller('journal')
export class JournalController {
    constructor(
        private readonly journalService: JournalService
    ) { }

    @Post('/sync')
    @ApiOperation({ summary: 'Sync journals from external source' })
    @ApiBody({ type: SyncQueryParamsDTO })
    @ApiResponse({ status: 200, description: 'Journals synced successfully' })
    @ApiResponse({ status: 500, description: 'Sync failed' })
    async sync(
        @Res() res: Response,
        @Body() data: SyncQueryParamsDTO
    ) {
        const result = await this.journalService.sync(data.init, data.limit);
        return res.status(result.status).json(result.data);
    }

    @Get('/sync-fetch')
    @ApiOperation({ summary: 'Fetch and sync latest journals' })
    @ApiResponse({ status: 200, description: 'Latest journals fetched and synced' })
    async syncFetch(
        @Res() res: Response,
    ) {
        const result = await this.journalService.syncJournal();
        return res.status(result.status).json(result.data);
    }
}
