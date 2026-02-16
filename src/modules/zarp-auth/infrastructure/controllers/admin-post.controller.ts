import { Body, Controller, Post, Res } from '@nestjs/common';
import { PostService } from '../../application/services/admin-post.service';
import { Response } from 'express';

@Controller('admin/post')
export class PostController {

    constructor(
        private readonly postService: PostService
    ) { }

    // TODO: adicionar validação do body
    @Post('/generate-image/image-fx')
    async generateFXImage(
        @Res() res: Response,
        @Body() data: { prompt: string }
    ) {
        const result = await this.postService.generateFXImage(data.prompt);
        return res.status(result.status).json(result.data)
    }
}
