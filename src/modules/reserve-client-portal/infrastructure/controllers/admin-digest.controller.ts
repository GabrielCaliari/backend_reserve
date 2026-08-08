import { Body, Controller, Get, Param, Patch, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { DigestService } from '../../application/services/digest.service';
import { PublishDigestDto } from '../../application/dtos/digest.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';

/**
 * Rotas mistas: `:tenantId/digests` carrega o tenant no caminho, mas
 * `digests/:id` (submit-review/publish) nao — e o dashboard nao envia
 * `x-tenant-id` neste controller. Um TenantGuard em nivel de classe quebraria
 * metade das rotas, entao fica FORA do gate de client-portal ate as rotas por
 * `:id` serem reescritas com o tenant no caminho.
 */
@Controller('admin/hotel-portal')
@UseGuards(AdminJwtGuard, PermissionsGuard)
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
