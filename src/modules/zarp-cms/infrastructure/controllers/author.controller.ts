import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  UploadedFile,
  UseInterceptors,
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
import { AuthorService } from '../../application/services/author.service';
import { CreateAuthorDTO } from '../../application/dtos/create-author.dto';
import { UpdateAuthorDTO } from '../../application/dtos/update-author.dto';
import { AuthorPresenter } from '../presenters/author.presenter';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../zarp-auth/domain/enums/admin-role.enum';

@ApiTags('CMS Author Management')
@Controller('authors')
@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant ID',
  required: true,
})
export class AuthorController {
  constructor(private readonly authorService: AuthorService) {}

  @Post()
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Create a new author' })
  @ApiResponse({ status: 201, description: 'Author created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid tenant' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Avatar MediaAsset not found' })
  async create(@Body() dto: CreateAuthorDTO, @Res() res: Response) {
    const result = await this.authorService.createAuthor(dto);

    if (result.status !== 201) {
      return res.status(result.status).json(result.data);
    }

    const presented = AuthorPresenter.present(result.data);
    return res.status(result.status).json(presented);
  }

  @Put(':id')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Update author information' })
  @ApiResponse({ status: 200, description: 'Author updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or avatar tenant mismatch' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Author or avatar not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAuthorDTO,
    @Res() res: Response,
  ) {
    const result = await this.authorService.updateAuthor(id, dto);

    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    const presented = AuthorPresenter.present(result.data);
    return res.status(result.status).json(presented);
  }

  @Get(':id')
  @Roles(EAdminRole.viewer)
  @ApiOperation({ summary: 'Get a single author by ID' })
  @ApiResponse({ status: 200, description: 'Author retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Author not found' })
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const result = await this.authorService.findById(id);

    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    const presented = AuthorPresenter.present(result.data);
    return res.status(result.status).json(presented);
  }

  @Get()
  @Roles(EAdminRole.viewer)
  @ApiOperation({ summary: 'List all authors with optional filters' })
  @ApiResponse({ status: 200, description: 'Authors retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid filter parameters' })
  async findAll(
    @Query('tenantId') tenantId: string,
    @Query('active') active?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Res() res?: Response,
  ) {
    const tenantIdNum = parseInt(tenantId, 10);
    if (isNaN(tenantIdNum)) {
      return res.status(400).json({
        code: '400:Invalid tenant ID',
        message: 'Tenant ID must be a valid number',
      });
    }

    const filters = {
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
    };

    const result = await this.authorService.findByTenantId(tenantIdNum, filters);

    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    const presented = AuthorPresenter.presentPaginated(result.data);
    return res.status(result.status).json(presented);
  }

  @Delete(':id')
  @Roles(EAdminRole.editor)
  @ApiOperation({
    summary: 'Delete an author (prevents deletion if author has published articles)',
  })
  @ApiResponse({ status: 200, description: 'Author deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete author with published articles',
  })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Author not found' })
  async delete(@Param('id') id: string, @Res() res: Response) {
    const result = await this.authorService.deleteAuthor(id);

    if (result.status === 204) {
      return res.status(200).json({ message: 'Author deleted successfully' });
    }

    return res.status(result.status).json(result.data);
  }

  @Post(':id/avatar')
  @Roles(EAdminRole.editor)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and assign avatar to author' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file',
        },
        avatarId: {
          type: 'string',
          description: 'Existing MediaAsset ID (UUID) to assign as avatar',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar assigned successfully' })
  @ApiResponse({
    status: 400,
    description: 'Avatar tenant mismatch or validation error',
  })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Author or avatar not found' })
  async uploadAvatar(
    @Param('id') id: string,
    @Body('avatarId') avatarId: string,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    // For now, we only support assigning existing MediaAsset IDs
    // File upload integration with MediaAsset system would be handled separately
    if (!avatarId) {
      return res.status(400).json({
        code: '400:Avatar ID is required',
        message: 'Please provide an existing MediaAsset ID as avatarId',
      });
    }

    const result = await this.authorService.assignAvatar(id, avatarId);

    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    const presented = AuthorPresenter.present(result.data);
    return res.status(result.status).json(presented);
  }
}
