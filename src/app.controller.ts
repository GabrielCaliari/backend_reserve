import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags('Health')
@Controller('')
export class AppController {
    @Get('/')
    @ApiOperation({ summary: 'Health check da aplicação' })
    @ApiResponse({ status: 200, description: 'Aplicação funcionando corretamente' })
    async app(
        @Res() res: Response
    ) {
        return res.status(200).json({ ok: true });
    }
}
