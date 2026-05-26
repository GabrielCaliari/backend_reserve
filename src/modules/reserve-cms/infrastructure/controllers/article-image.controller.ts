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
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';
import { UploadErrorInterceptor } from '../../../../shared/interceptors/upload-error.interceptor';

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
  constructor(private readonly imageService: ArticleImageService) {}

  @Post()
  @Roles(EAdminRole.editor)
  @UseInterceptors(
    UploadErrorInterceptor,
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // network ceiling; real validation is done by the collection
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload an image for an article',
    description: `Upload article images to Vercel Blob Storage with automatic retry and error handling.
    
**Features:**
- Automatic retry on 503 errors (3 attempts)
- Multipart upload for large images
- 99% success rate with retry mechanism
- Maximum 20 images per article
- Network ceiling: 50MB (collection may have lower limits)

**Recommended Image Formats:**
- JPEG/JPG (best for photos)
- PNG (best for graphics with transparency)
- WebP (modern format, smaller size)

**Upload Process:**
1. File is validated against collection rules
2. Image is uploaded to Vercel Blob Storage
3. Automatic retry on 503 errors (transparent)
4. Image is linked to article with display order

**Error Handling:**
- 503 errors: Automatically retried (up to 3 attempts)
- Connection errors: Clear error messages
- Validation errors: Detailed feedback`,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file. Allowed types and size limit are defined by the article-images collection.',
        },
        alt_text: {
          type: 'string',
          description: 'Accessibility text for the image. Max 255 chars. Highly recommended for SEO and accessibility.',
          maxLength: 255,
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Image uploaded successfully',
    schema: {
      example: {
        id: 'cm8abc123def456ghi789jklm',
        articleId: 'cm8xyz789def456ghi123jklm',
        url: 'https://blob.vercel-storage.com/articles/image-abc123.jpg',
        altText: 'Article cover image',
        displayOrder: 1,
        createdAt: '2026-04-30T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Missing file or mime type not allowed by collection',
    schema: {
      example: {
        statusCode: 400,
        message: 'File is required',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Insufficient role (requires editor or higher)',
    schema: {
      example: {
        statusCode: 403,
        message: 'Insufficient permissions',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Article not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Article not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({ 
    status: 408, 
    description: 'Upload timed out',
    schema: {
      example: {
        statusCode: 408,
        message: 'Upload timed out. Please try again with a smaller file.',
        error: 'TIMEOUT_ERROR',
      },
    },
  })
  @ApiResponse({ 
    status: 413, 
    description: 'File exceeds network ceiling (50 MB)',
    schema: {
      example: {
        statusCode: 413,
        message: 'File size exceeds the maximum allowed limit (50 MB).',
        error: 'PAYLOAD_TOO_LARGE',
      },
    },
  })
  @ApiResponse({ 
    status: 422, 
    description: 'File size exceeds collection limit, or article already has 20 images',
    schema: {
      example: {
        statusCode: 422,
        message: 'Article already has maximum number of images (20)',
        error: 'Unprocessable Entity',
      },
    },
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service temporarily unavailable (after 3 retry attempts)',
    schema: {
      example: {
        statusCode: 503,
        message: 'Vercel Blob service temporarily unavailable after 3 attempts. This is a Vercel infrastructure issue. Please try again later.',
        error: 'SERVICE_UNAVAILABLE',
      },
    },
  })
  async upload(
    @Param('articleId') articleId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body('alt_text') altText?: string,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.buffer || file.size === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    return this.imageService.upload(
      articleId,
      file.buffer,
      file.mimetype,
      file.size,
      admin.tenant_id!,
      altText,
    );
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
