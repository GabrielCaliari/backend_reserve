import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { UserValidateJwtTokenGuard } from 'src/common/guards/user-validate-jwt-token/user-validate-jwt-token.guard';
import { PiBotService } from './pi-bot.service';
import { PiBotMessageValidator } from 'src/common/validators/pi-bot/message.validator';

@Controller('pi-bot')
export class PiBotController {
    constructor(
        private readonly piBotServicer: PiBotService,
    ) { }

    @Post('/message')
    @UseGuards(UserValidateJwtTokenGuard)
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
