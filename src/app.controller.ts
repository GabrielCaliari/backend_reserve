import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";

@Controller('')
export class AppController {
    @Get('/')
    async app(
        @Res() res: Response
    ) {
        return res.status(200).json({ ok: true });
    }
}
