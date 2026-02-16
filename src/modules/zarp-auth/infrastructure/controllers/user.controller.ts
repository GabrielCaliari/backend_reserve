import { Body, Controller, Get, Param, Post, Req, Res, UseGuards, UseInterceptors, UsePipes } from '@nestjs/common';
import { UserService } from '../../application/services/user.service';
import { ToLowercaseBodyRequestPipe } from '@/common/pipe/to-lowercase-body-request/to-lowercase-body-request.pipe';
import { Response } from 'express';
import CreateUserValidator from '@/common/validators/user/create-user.validator';
import AuthUserValidator from '@/common/validators/user/auth-user.validator';
import { UserJwtGuard } from '@/shared/auth/guards';
import axios from 'axios';
import PreCreateUserValidator from '@/common/validators/user/pre-create-user.validator';

@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService,
    ) { }

    @Post('/')
    @UsePipes(ToLowercaseBodyRequestPipe)
    async create(
        @Res() res: Response,
        @Body() data: CreateUserValidator,
    ) {
        const result = await this.userService.create({
            cpf: data.cpf,
            email: data.email,
            name: data.name,
            password: data.password,
            phone_number: data.phone_number
            // sex: +data.sex,
            // date_of_birth: new Date(data.date_of_birth),
        });

        return res.status(result.status).json(result.data);
    }

    @Post('/pre/create')
    @UsePipes(ToLowercaseBodyRequestPipe)
    async preCreate(
        @Res() res: Response,
        @Body() data: PreCreateUserValidator,
    ) {
        const result = await this.userService.preCreate({
            email: data.email,
            name: data.name,
            phone_number: data.phone_number
            // sex: +data.sex,
            // date_of_birth: new Date(data.date_of_birth),
        });

        return res.status(result.status).json(result.data);   
    }

    @Post('/authenticate')
    async authenticateUser(@Res() res: Response, @Body() data: AuthUserValidator) {
        const result = await this.userService.authenticate(data);
        return res.status(result.status).json(result.data)
    }

    @Get('/feed')
    @UseGuards(UserJwtGuard)
    async feed(
        @Res() res: Response,
        @Req() req: Request & { user_id: number },
    ) {
        const userId = req.user_id;
        const result = await this.userService.feed(userId);
        return res.status(result.status).json(result.data)
    }

    @Get('/me')
    @UseGuards(UserJwtGuard)
    async me(
        @Res() res: Response,
        @Req() req: Request & { user_id: number },
    ) {
        const userId = req.user_id;
        const result = await this.userService.me(userId);
        return res.status(result.status).json(result.data)
    }

    @Post('/generate-payment-account-link')
    @UseGuards(UserJwtGuard)
    async generatePaymentAccountLink(
        @Res() res: Response,
        @Req() req: Request & { user_id: number; },
    ) {
        const result = await this.userService.generatePaymentAccountLink(
            req.user_id
        );

        return res.status(result.status).json(result.data);
    }

    @Post('/checkout/:slug/:period')
    @UseGuards(UserJwtGuard)
    async checkout(
        @Res() res: Response,
        @Req() req: Request & { user_id: number; },
        @Param('period') period: string,
        @Param('slug') slug: string,
    ) {
        switch (period.toLocaleLowerCase()) {
            case 'annual':
            case 'month':
                break;
            default:
                period = 'month';
                break;
        }

        const result = await this.userService.checkout(slug, req.user_id, period.toLocaleLowerCase());
        return res.status(result.status).json(result.data);
    }

    @Post('/order-brand-analysis/checkout/:slug')
    @UseGuards(UserJwtGuard)
    async checkoutOrderBrandAnalysis(
        @Res() res: Response,
        @Req() req: Request & { user_id: number; },
        @Param('slug') slug: string,
    ) {
        const result = await this.userService.checkoutOrderBrandAnalysis(slug, req.user_id);
        return res.status(result.status).json(result.data);
    }

    // TODO: Adicionar um guard para validar a geração de tokens por meio de chaves armazenadas no banco
    @Post('/webhook/generate-tokens/:key/:user_id/:tokens')
    async generateTokens(
        @Res() res: Response,
        @Req() req: Request,
        @Param('key') key: string,
        @Param('tokens') tokens: string,
        @Param('user_id') userId: string
    ) {
        const result = await this.userService.generateTokens(
            key,
            +tokens,
            +userId,
        );
        return res.status(result.status).json(result.data);
    }
}
