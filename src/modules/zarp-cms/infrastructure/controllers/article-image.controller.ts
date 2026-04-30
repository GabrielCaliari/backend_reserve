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
  @ApiOperation({ summary: 'Upload an image for an article' })
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
          description: 'Accessibility text for the image. Max 255 chars.',
          maxLength: 255,
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Missing file or mime type not allowed by collection' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  @ApiResponse({ status: 413, description: 'File exceeds network ceiling (50 MB)' })
  @ApiResponse({ status: 422, description: 'File size exceeds collection limit, or article already has 20 images' })
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
