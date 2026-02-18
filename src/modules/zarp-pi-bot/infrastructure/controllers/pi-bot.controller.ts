import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { UserJwtGuard } from '../../../../shared/auth/guards';
import { PiBotService } from '../../application/services/pi-bot.service';
import { PiBotMessageDTO } from '../../application/dtos/pi-bot-message.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Pi Bot')
@Controller()
export class PiBotController {
    constructor(
        private readonly piBotServicer: PiBotService,
    ) { }

    @Post('/message')
    @UseGuards(UserJwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Send message (authenticated)', description: 'Sends a message to the AI bot with conversation history. Requires user authentication.' })
    @ApiResponse({ status: 200, description: 'Bot response returned successfully' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    async message(
        @Res() res: Response,
        @Req() req: Request & { user_id: number },
        @Body() data: PiBotMessageDTO
    ) {
        const userId = req.user_id;
        const result = await this.piBotServicer.message({
            user_id: userId,
            history: data.history,
            message: data.message
        });

        return res.status(result.status).json(result.data);
    }

    @Post('/public-message')
    @ApiOperation({ summary: 'Send public message', description: 'Sends a message to the AI bot without authentication. Public access.' })
    @ApiResponse({ status: 200, description: 'Bot response returned successfully' })
    async publicMessage(
        @Res() res: Response,
        @Body() data: PiBotMessageDTO
    ) {
        const result = await this.piBotServicer.publicMessage({
            history: data.history,
            message: data.message
        });

        return res.status(result.status).json(result.data);
    }
}
