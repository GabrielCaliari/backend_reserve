import { Controller, Get, Query, Res, Param, UsePipes, ValidationPipe } from '@nestjs/common';
import { Response } from 'express';
import { PostService } from './post.service';
import { PaginationQuery } from 'src/common/validators/pagination.dto';
import { SlugParam } from 'src/common/validators/slug.param';

@Controller('post')
export class PostController {
    constructor(
        private readonly postService: PostService,
    ) { }

    @Get('/')
    @UsePipes(new ValidationPipe({ transform: true }))
    async getAllPosts(
        @Res() res: Response,
        @Query() paginationQuery: PaginationQuery,
    ) {
        const result = await this.postService.getAllPosts(
            paginationQuery.page,
            paginationQuery.limit
        );
        return res.status(result.status).json(result.data);
    }

    @Get('/by-slug/:slug')
    @UsePipes(new ValidationPipe({ transform: true }))
    async getPostBySlug(
        @Res() res: Response,
        @Param() params: SlugParam,
    ) {
        const result = await this.postService.getPostBySlug(params.slug);
        return res.status(result.status).json(result.data);
    }
}
