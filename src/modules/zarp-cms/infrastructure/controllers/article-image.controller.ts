import {
  Controller,
  Post,
  Delete,
  Put,
  Get,
  Body,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ArticleImageService } from '../../application/services/article-image.service';
import { ReorderImagesDTO } from '../../application/dtos/reorder-images.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { EAdminRole } from '../../../zarp-auth/domain/enums/admin-role.enum';

@ApiTags('CMS Image Management')
@Controller('articles/:articleId/images')
@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant ID',
  required: true,
})
export class ArticleImageController {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  private readonly ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  constructor(private readonly imageService: ArticleImageService) {}

  @Post()
  @Roles(EAdminRole.editor)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image for an article' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, GIF, WebP, AVIF). Max 10 MB.',
        },
        alt_text: {
          type: 'string',
          description: 'Accessibility text for the image. Max 255 chars.',
          maxLength: 255,
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file format or missing file' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  @ApiResponse({ status: 413, description: 'File exceeds 10 MB limit' })
  @ApiResponse({ status: 422, description: 'Article already has 20 images (maximum limit)' })
  async upload(
    @Param('articleId') articleId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('alt_text') altText?: string,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.buffer || file.size === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    if (!this.ALLOWED_FORMATS.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file format. Allowed formats: JPEG, PNG, GIF, WebP, AVIF',
      );
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10 MB limit');
    }

    // Extract format from mimetype (e.g., 'image/jpeg' -> 'jpeg')
    const format = file.mimetype.split('/')[1];

    return this.imageService.upload(articleId, file.buffer, format, altText);
  }

  @Get()
  @Roles(EAdminRole.viewer)
  @ApiOperation({ summary: 'List all images for an article' })
  @ApiResponse({ status: 200, description: 'Images retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async findAll(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('articleId') articleId: string,
    @Res() res: Response,
  ) {
    const result = await this.imageService.findAllByArticleId(articleId, admin.tenant_id);
    return res.status(200).json(result);
  }

  @Delete(':imageId')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Delete a specific image from an article' })
  @ApiResponse({ status: 200, description: 'Image deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Image or article not found' })
  async delete(@Param('imageId') imageId: string): Promise<any> {
    await this.imageService.delete(String(imageId));
    return { message: 'Image deleted successfully' };
  }

  @Put('reorder')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Reorder images within an article' })
  @ApiResponse({ status: 200, description: 'Images reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid image IDs' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async reorder(
    @Param('articleId') articleId: string,
    @Body() dto: ReorderImagesDTO,
  ): Promise<any> {
    await this.imageService.reorderImages(articleId, dto.order.map(item => ({ id: String(item.id), display_order: item.display_order })));
    return { message: 'Images reordered successfully' };
  }
}
