import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { PostService } from '../../application/services/admin-post.service';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../domain/enums/admin-role.enum';

@ApiTags('Admin Post')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, RolesGuard)
@Roles(EAdminRole.super_admin)
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
