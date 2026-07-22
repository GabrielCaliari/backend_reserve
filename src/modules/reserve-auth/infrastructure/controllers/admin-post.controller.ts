import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { PostService } from '../../application/services/admin-post.service';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import GenerateImageDTO from '../../application/dtos/generate-image.dto';

@ApiTags('Admin Post')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('post.image-generation.manage')
@Controller('admin/post')
export class PostController {

    constructor(
        private readonly postService: PostService
    ) { }

    @Post('/generate-image/image-fx')
    @ApiOperation({ summary: 'Generate an ImageFX image from a prompt' })
    @ApiBody({ type: GenerateImageDTO })
    @ApiResponse({ status: 200, description: 'Image generated successfully' })
    @ApiResponse({ status: 500, description: 'Image generation failed' })
    async generateFXImage(
        @Res() res: Response,
        @Body() data: GenerateImageDTO
    ) {
        const result = await this.postService.generateFXImage(data.prompt);
        return res.status(result.status).json(result.data)
    }
}
