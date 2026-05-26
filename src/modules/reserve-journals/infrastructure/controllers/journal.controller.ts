import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { JournalService } from '../../application/services/journal.service';
import { Response } from 'express';
import SyncQueryParamsDTO from '../../application/dtos/sync-query-params.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';

@ApiTags('Journal')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, RolesGuard)
@Roles(EAdminRole.super_admin)
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
