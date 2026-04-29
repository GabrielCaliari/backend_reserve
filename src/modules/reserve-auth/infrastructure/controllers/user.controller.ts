import { Body, Controller, Get, Param, Post, Req, Res, UseGuards, UsePipes } from '@nestjs/common';
import { UserService } from '../../application/services/user.service';
import { ParseCuidPipe, ToLowercaseBodyRequestPipe } from '../../../../shared/pipes';
import { Request, Response } from 'express';
import CreateUserDTO from '../../application/dtos/create-user.dto';
import AuthUserDTO from '../../application/dtos/auth-user.dto';
import { UserJwtGuard, UserRolesGuard } from '../../../../shared/auth/guards';
import { UserRoles } from '../../../../shared/auth/decorators';
import PreCreateUserDTO from '../../application/dtos/pre-create-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { EUserCollectionRole } from '../../domain/enums/user-collection-role.enum';

@ApiTags('User')
@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService,
    ) { }

    @Post('/')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
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
    @Throttle({ default: { limit: 5, ttl: 60000 } })
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
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: 'Authenticate user' })
    @ApiBody({ type: AuthUserDTO })
    @ApiResponse({ status: 200, description: 'Authentication successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    @ApiResponse({ status: 423, description: 'Conta bloqueada por tentativas de senha incorretas' })
    async authenticateUser(@Res() res: Response, @Body() data: AuthUserDTO) {
        const result = await this.userService.authenticate(data);
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
        @Req() req: Request & { user_id: string },
    ) {
        const userId = req.user_id;
        const result = await this.userService.me(userId);
        return res.status(result.status).json(result.data)
    }

    @Get('/collections')
    @UseGuards(UserJwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List collections accessible to the authenticated user' })
    @ApiResponse({ status: 200, description: 'User collections returned' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    async listCollections(
        @Res() res: Response,
        @Req() req: Request & { user_id: string },
    ) {
        const tenantIdHeader = req.headers['x-tenant-id'];
        const tenantId = Array.isArray(tenantIdHeader) ? tenantIdHeader[0] : tenantIdHeader;
        const result = await this.userService.listCollections(req.user_id, tenantId);
        return res.status(result.status).json(result.data);
    }

    @Get('/collections/:collectionId')
    @UseGuards(UserJwtGuard, UserRolesGuard)
    @UserRoles(EUserCollectionRole.guest)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get authenticated user context inside a collection' })
    @ApiParam({ name: 'collectionId', description: 'User collection CUID', example: 'cma1collec001ghijklmno23p' })
    @ApiResponse({ status: 200, description: 'User collection context returned' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    @ApiResponse({ status: 403, description: 'User has no access to this collection' })
    async getCollectionContext(
        @Res() res: Response,
        @Req() req: Request & { user_id: string; collection_id?: string; tenant_id?: string },
        @Param('collectionId', ParseCuidPipe) collectionId: string,
    ) {
        const result = await this.userService.getCollectionContext(req.user_id, collectionId, req.tenant_id);
        return res.status(result.status).json(result.data);
    }

    @Post('/generate-payment-account-link')
    @UseGuards(UserJwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Generate payment account link for the user' })
    @ApiResponse({ status: 200, description: 'Payment account link generated' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    async generatePaymentAccountLink(
        @Res() res: Response,
        @Req() req: Request & { user_id: string; },
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
        @Req() req: Request & { user_id: string; },
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

}
