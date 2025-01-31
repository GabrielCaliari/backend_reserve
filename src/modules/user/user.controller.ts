import { Body, Controller, Get, Post, Req, Res, UseGuards, UseInterceptors, UsePipes } from '@nestjs/common';
import { UserService } from './user.service';
import { ToLowercaseBodyRequestPipe } from 'src/common/pipe/to-lowercase-body-request/to-lowercase-body-request.pipe';
import { Response } from 'express';
import CreateUserValidator from 'src/common/validators/user/create-user.validator';
import AuthUserValidator from 'src/common/validators/user/auth-user.validator';
import { UserValidateJwtTokenGuard } from 'src/common/guards/user-validate-jwt-token/user-validate-jwt-token.guard';

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

    @Post('/authenticate')
    async authenticateUser(@Res() res: Response, @Body() data: AuthUserValidator) {
        const result = await this.userService.authenticate(data);
        return res.status(result.status).json(result.data)
    }

    @Get('/feed')
    @UseGuards(UserValidateJwtTokenGuard)
    async feed(
        @Res() res: Response,
        @Req() req: Request & { user_id: number },
    ) {
        const userId = req.user_id;
        const result = await this.userService.feed(userId);
        return res.status(result.status).json(result.data)
    }

    @Get('/me')
    @UseGuards(UserValidateJwtTokenGuard)
    async me(
        @Res() res: Response,
        @Req() req: Request & { user_id: number },
    ) {
        const userId = req.user_id;
        const result = await this.userService.me(userId);
        return res.status(result.status).json(result.data)
    }
}
