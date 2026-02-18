import { Body, Controller, Get, Param, Post, Req, Res, UseGuards, UseInterceptors, UsePipes } from '@nestjs/common';
import { UserService } from '../../application/services/user.service';
import { ToLowercaseBodyRequestPipe } from '../../../../shared/pipes';
import { Response } from 'express';
import CreateUserDTO from '../../application/dtos/create-user.dto';
import AuthUserDTO from '../../application/dtos/auth-user.dto';
import { UserJwtGuard } from '../../../../shared/auth/guards';
import axios from 'axios';
import PreCreateUserDTO from '../../application/dtos/pre-create-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('User')
@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService,
    ) { }

    @Post('/')
    @ApiOperation({ summary: 'Create a new user' })
    @ApiBody({ type: CreateUserDTO })
    @ApiResponse({ status: 201, description: 'User created successfully' })
    @ApiResponse({ status: 409, description: 'User already exists' })
    @UsePipes(ToLowercaseBodyRequestPipe)
    async create(
        @Res() res: Response,
        @Body() data: CreateUserDTO,
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
    @ApiOperation({ summary: 'Pre-create a user (partial registration)' })
    @ApiBody({ type: PreCreateUserDTO })
    @ApiResponse({ status: 201, description: 'User pre-created successfully' })
    @ApiResponse({ status: 409, description: 'User already exists' })
    @UsePipes(ToLowercaseBodyRequestPipe)
    async preCreate(
        @Res() res: Response,
        @Body() data: PreCreateUserDTO,
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
    @ApiOperation({ summary: 'Authenticate user' })
    @ApiBody({ type: AuthUserDTO })
    @ApiResponse({ status: 200, description: 'Authentication successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async authenticateUser(@Res() res: Response, @Body() data: AuthUserDTO) {
        const result = await this.userService.authenticate(data);
        return res.status(result.status).json(result.data)
    }

    @Get('/feed')
    @UseGuards(UserJwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user feed data' })
    @ApiResponse({ status: 200, description: 'Feed data returned' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
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
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get authenticated user data' })
    @ApiResponse({ status: 200, description: 'User data returned' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
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
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Generate payment account link for the user' })
    @ApiResponse({ status: 200, description: 'Payment account link generated' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
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
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Checkout a plan subscription' })
    @ApiParam({ name: 'slug', description: 'Plan slug identifier' })
    @ApiParam({ name: 'period', description: 'Billing period (month or annual)' })
    @ApiResponse({ status: 200, description: 'Checkout session created' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
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
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Checkout for brand analysis order' })
    @ApiParam({ name: 'slug', description: 'Brand analysis plan slug' })
    @ApiResponse({ status: 200, description: 'Brand analysis checkout session created' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    async checkoutOrderBrandAnalysis(
        @Res() res: Response,
        @Req() req: Request & { user_id: number; },
        @Param('slug') slug: string,
    ) {
        const result = await this.userService.checkoutOrderBrandAnalysis(slug, req.user_id);
        return res.status(result.status).json(result.data);
    }

    // TODO: Add a guard to validate token generation via keys stored in the database
    @Post('/webhook/generate-tokens/:key/:user_id/:tokens')
    @ApiOperation({ summary: 'Webhook to generate user tokens' })
    @ApiParam({ name: 'key', description: 'Webhook secret key' })
    @ApiParam({ name: 'user_id', description: 'Target user ID' })
    @ApiParam({ name: 'tokens', description: 'Number of tokens to generate' })
    @ApiResponse({ status: 200, description: 'Tokens generated successfully' })
    @ApiResponse({ status: 400, description: 'Invalid parameters' })
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
