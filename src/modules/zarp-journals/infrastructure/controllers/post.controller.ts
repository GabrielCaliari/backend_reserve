import { Controller, Get, Query, Res, Param, UsePipes, ValidationPipe } from '@nestjs/common';
import { Response } from 'express';
import { PostService } from '../../application/services/post.service';
import { PaginationQuery } from '@/common/validators/pagination.dto';
import { SlugParam } from '@/common/validators/slug.param';

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

    @Get('/metadata/by-slug/:slug')
    @UsePipes(new ValidationPipe({ transform: true }))
    async getPostMetadata(
        @Res() res: Response,
        @Param() params: SlugParam,
    ) {
        const result = await this.postService.getPostMetadata(params.slug);
        return res.status(result.status).json(result.data);
    }

    @Get('/sitemap')
    async getSitemap(
        @Res() res: Response,
    ) {
        const result = await this.postService.getSitemap();
        return res.status(result.status).json(result.data);
    }
}