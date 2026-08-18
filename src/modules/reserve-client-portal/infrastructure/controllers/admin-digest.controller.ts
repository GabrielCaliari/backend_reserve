import { Body, Controller, Get, Param, Patch, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { DigestService } from '../../application/services/digest.service';
import { PublishDigestDto } from '../../application/dtos/digest.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import {
  ScopedToTenantResource,
  TenantResourceScopeGuard,
} from '../guards/tenant-resource-scope.guard';

/**
 * Rotas mistas: `:tenantId/digests` carrega o tenant no caminho e
 * `digests/:id` (submit-review/publish) nao. As duas convergem no TenantGuard,
 * que resolve o tenant do param quando ele existe e do header `x-tenant-id`
 * quando nao — o mesmo header que o dashboard ja envia por padrao. Para as
 * rotas por `:id` o TenantResourceScopeGuard confere que o DigestReport e do
 * tenant da sessao; em `:tenantId/digests` a chave `id` nao existe e a
 * referencia e ignorada (o proprio TenantGuard ja validou o param).
 */
@Controller('admin/hotel-portal')
@UseGuards(
  AdminJwtGuard,
  TenantGuard,
  ModuleAccessGuard,
  TenantResourceScopeGuard,
  PermissionsGuard,
)
@RequiresModule('client-portal')
@ScopedToTenantResource({ kind: 'digestReport', key: 'id' })
@RequirePermissions('hotel-portal.digests.manage')
export class AdminDigestController {
  constructor(private readonly digestService: DigestService) {}

  @Get(':tenantId/digests')
  async findByTenantId(
    @Param('tenantId') tenantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '12',
    @Res() res: Response,
  ) {
    const result = await this.digestService.findByTenantId(tenantId, Number(page), Number(limit));
    return res.status(result.status).json(result.data);
  }

  @Get('digests/:id')
  async findById(@Param('id') id: string, @Res() res: Response) {
    const result = await this.digestService.findById(id);
    return res.status(result.status).json(result.data);
  }

  @Patch('digests/:id/submit-review')
  async submitForReview(@Param('id') id: string, @Res() res: Response) {
    const result = await this.digestService.submitForReview(id);
    return res.status(result.status).json(result.data);
  }

  @Patch('digests/:id/publish')
  @RequirePermissions('hotel-portal.digests.publish')
  async publish(
    @Param('id') id: string,
    @Body() dto: PublishDigestDto,
    @Res() res: Response,
  ) {
    const result = await this.digestService.publish(id, dto);
    return res.status(result.status).json(result.data);
  }
}
