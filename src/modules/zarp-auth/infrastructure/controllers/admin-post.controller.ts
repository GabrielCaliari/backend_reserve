import { Body, Controller, Post, Res } from '@nestjs/common';
import { PostService } from '../../application/services/admin-post.service';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Admin Post')
@Controller('admin/post')
export class PostController {

    constructor(
        private readonly postService: PostService
    ) { }

    // TODO: add body validation
    @Post('/generate-image/image-fx')
    @ApiOperation({ summary: 'Generate an ImageFX image from a prompt' })
    @ApiBody({ schema: { type: 'object', properties: { prompt: { type: 'string', example: 'A futuristic city skyline at sunset' } }, required: ['prompt'] } })
    @ApiResponse({ status: 200, description: 'Image generated successfully' })
    @ApiResponse({ status: 500, description: 'Image generation failed' })
    async generateFXImage(
        @Res() res: Response,
        @Body() data: { prompt: string }
    ) {
        const result = await this.postService.generateFXImage(data.prompt);
        return res.status(result.status).json(result.data)
    }
}
