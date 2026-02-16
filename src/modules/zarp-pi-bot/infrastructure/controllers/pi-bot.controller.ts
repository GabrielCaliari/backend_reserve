import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { UserJwtGuard } from '@/shared/auth/guards';
import { PiBotService } from '../../application/services/pi-bot.service';
import { PiBotMessageValidator } from '@/common/validators/pi-bot/message.validator';

@Controller()
export class PiBotController {
    constructor(
        private readonly piBotServicer: PiBotService,
    ) { }

    @Post('/message')
    @UseGuards(UserJwtGuard)
    async message(
        @Res() res: Response,
        @Req() req: Request & { user_id: number },
        @Body() data: PiBotMessageValidator
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
    async publicMessage(
        @Res() res: Response,
        @Body() data: PiBotMessageValidator
    ) {
        const result = await this.piBotServicer.publicMessage({
            history: data.history,
            message: data.message
        });

        return res.status(result.status).json(result.data);
    }
}
