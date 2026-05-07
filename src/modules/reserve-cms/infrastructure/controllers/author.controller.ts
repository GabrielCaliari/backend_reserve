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
  ApiBody,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthorService } from '../../application/services/author.service';
import { CreateAuthorDTO } from '../../application/dtos/create-author.dto';
import { UpdateAuthorDTO } from '../../application/dtos/update-author.dto';
import {
  AssignAuthorAvatarDTO,
  AuthorResponseDTO,
  PaginatedAuthorsResponseDTO,
  SuccessMessageResponseDTO,
} from '../../application/dtos/author-response.dto';
import { AuthorPresenter } from '../presenters/author.presenter';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';
import { UuidValidationPipe } from '../pipes/uuid-validation.pipe';

@ApiTags('CMS Author Management')
@Controller('authors')
@UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
@ApiExtraModels(AuthorResponseDTO, PaginatedAuthorsResponseDTO, SuccessMessageResponseDTO)
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant CUID (25 caracteres)',
  required: true,
})
export class AuthorController {
  constructor(private readonly authorService: AuthorService) {}

  @Post()
  @RequirePermissions('cms.author.create')
  @ApiOperation({
    summary: 'Create a new author',
    description: 'Creates a tenant-scoped author using the tenant resolved from the x-tenant-id header.',
  })
  @ApiBody({ type: CreateAuthorDTO })
  @ApiCreatedResponse({ description: 'Author created successfully', type: AuthorResponseDTO })
  @ApiBadRequestResponse({ description: 'Validation error, invalid tenant CUID, or invalid avatar CUID' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  @ApiNotFoundResponse({ description: 'Avatar MediaAsset not found' })
  async create(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: CreateAuthorDTO,
    @Res() res: Response,
  ) {
    const result = await this.authorService.createAuthor(dto, admin.tenant_id);

    if (result.status !== 201) {
      return res.status(result.status).json(result.data);
    }

    const presented = AuthorPresenter.present(result.data as any);
    return res.status(result.status).json(presented);
  }

  @Put(':id')
  @RequirePermissions('cms.author.update')
  @ApiOperation({ summary: 'Update author information' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Author CUID (25 caracteres)',
    example: 'cmcmsauthor01abc234def5678',
  })
  @ApiOkResponse({ description: 'Author updated successfully', type: AuthorResponseDTO })
  @ApiBadRequestResponse({ description: 'Validation error, invalid author CUID, or invalid avatar CUID' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  @ApiNotFoundResponse({ description: 'Author or avatar not found for this tenant' })
  async update(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateAuthorDTO,
    @Res() res: Response,
  ) {
    const result = await this.authorService.updateAuthor(id, dto, admin.tenant_id);

    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    const presented = AuthorPresenter.present(result.data as any);
    return res.status(result.status).json(presented);
  }

  @Get(':id')
  @RequirePermissions('cms.author.read')
  @ApiOperation({ summary: 'Get a single author by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Author CUID (25 caracteres)',
    example: 'cmcmsauthor01abc234def5678',
  })
  @ApiOkResponse({ description: 'Author retrieved successfully', type: AuthorResponseDTO })
  @ApiBadRequestResponse({ description: 'Invalid author CUID' })
  @ApiNotFoundResponse({ description: 'Author not found for this tenant' })
  async findOne(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('id', UuidValidationPipe) id: string,
    @Res() res: Response,
  ) {
    const result = await this.authorService.findById(id, admin.tenant_id);

    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    const presented = AuthorPresenter.present(result.data as any);
    return res.status(result.status).json(presented);
  }

  @Get()
  @RequirePermissions('cms.author.read')
  @ApiOperation({ summary: 'List all authors with optional filters' })
  @ApiQuery({
    name: 'active',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
    example: true,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (starts at 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 30,
  })
  @ApiOkResponse({ description: 'Authors retrieved successfully', type: PaginatedAuthorsResponseDTO })
  @ApiBadRequestResponse({ description: 'Invalid filter parameters or missing tenant context' })
  async findAll(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
    @Query('active') active?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = admin.tenant_id;
    if (!tenantId) {
      return res.status(400).json({
        code: '400:Invalid tenant ID',
        message: 'Tenant ID is required',
      });
    }

    const filters = {
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
    };

    const result = await this.authorService.findByTenantId(tenantId, filters);

    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    const presented = AuthorPresenter.presentPaginated(result.data as any);
    return res.status(result.status).json(presented);
  }

  @Delete(':id')
  @RequirePermissions('cms.author.delete')
  @ApiOperation({
    summary: 'Delete an author (prevents deletion if author has published articles)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Author CUID (25 caracteres)',
    example: 'cmcmsauthor01abc234def5678',
  })
  @ApiOkResponse({ description: 'Author deleted successfully', type: SuccessMessageResponseDTO })
  @ApiBadRequestResponse({
    description: 'Invalid author CUID or author has published articles',
  })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  @ApiNotFoundResponse({ description: 'Author not found for this tenant' })
  async delete(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('id', UuidValidationPipe) id: string,
    @Res() res: Response,
  ) {
    const result = await this.authorService.deleteAuthor(id, admin.tenant_id);

    if (result.status === 204) {
      return res.status(200).json({ message: 'Author deleted successfully' });
    }

    return res.status(result.status).json(result.data);
  }

  @Post(':id/avatar')
  @RequirePermissions('cms.author.update')
  @ApiOperation({
    summary: 'Assign an existing media asset as the author avatar',
    description: 'This endpoint links an already uploaded media asset to the author. Direct file upload is not handled here.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Author CUID (25 caracteres)',
    example: 'cmcmsauthor01abc234def5678',
  })
  @ApiBody({ type: AssignAuthorAvatarDTO })
  @ApiOkResponse({ description: 'Avatar assigned successfully', type: AuthorResponseDTO })
  @ApiBadRequestResponse({
    description: 'Invalid author/avatar CUID or avatar tenant mismatch',
  })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  @ApiNotFoundResponse({ description: 'Author or avatar not found for this tenant' })
  async uploadAvatar(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: AssignAuthorAvatarDTO,
    @Res() res: Response,
  ) {
    const { avatarId } = body;

    if (!avatarId) {
      return res.status(400).json({
        code: '400:Avatar ID is required',
        message: 'Please provide an existing MediaAsset CUID as avatarId',
      });
    }

    const result = await this.authorService.assignAvatar(id, avatarId, admin.tenant_id);

    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    const presented = AuthorPresenter.present(result.data as any);
    return res.status(result.status).json(presented);
  }
}
