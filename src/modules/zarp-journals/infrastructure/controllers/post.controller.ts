import { Controller, Get, Query, Res, Param, UsePipes, ValidationPipe } from '@nestjs/common';
import { Response } from 'express';
import { PostService } from '../../application/services/post.service';
import { PaginationQuery } from '@/shared/validators/pagination.dto';
import { SlugParam } from '@/shared/validators/slug.param';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('Post')
@Controller('post')
export class PostController {
    constructor(
        private readonly postService: PostService,
    ) { }

    @Get('/')
    @ApiOperation({ summary: 'Get all posts (paginated)' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page (max 12)', example: 9 })
    @ApiResponse({ status: 200, description: 'Posts list returned' })
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
    @ApiOperation({ summary: 'Get a post by its slug' })
    @ApiParam({ name: 'slug', description: 'Post slug identifier' })
    @ApiResponse({ status: 200, description: 'Post returned' })
    @ApiResponse({ status: 404, description: 'Post not found' })
    @UsePipes(new ValidationPipe({ transform: true }))
    async getPostBySlug(
        @Res() res: Response,
        @Param() params: SlugParam,
    ) {
        const result = await this.postService.getPostBySlug(params.slug);
        return res.status(result.status).json(result.data);
    }

    @Get('/metadata/by-slug/:slug')
    @ApiOperation({ summary: 'Get post metadata by slug' })
    @ApiParam({ name: 'slug', description: 'Post slug identifier' })
    @ApiResponse({ status: 200, description: 'Post metadata returned' })
    @ApiResponse({ status: 404, description: 'Post not found' })
    @UsePipes(new ValidationPipe({ transform: true }))
    async getPostMetadata(
        @Res() res: Response,
        @Param() params: SlugParam,
    ) {
        const result = await this.postService.getPostMetadata(params.slug);
        return res.status(result.status).json(result.data);
    }

    @Get('/sitemap')
    @ApiOperation({ summary: 'Get sitemap data for all posts' })
    @ApiResponse({ status: 200, description: 'Sitemap data returned' })
    async getSitemap(
        @Res() res: Response,
    ) {
        const result = await this.postService.getSitemap();
        return res.status(result.status).json(result.data);
    }
}