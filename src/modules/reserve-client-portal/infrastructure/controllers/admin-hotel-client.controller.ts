import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HotelClientService } from '../../application/services/hotel-client.service';
import { OtaDirectService } from '../../application/services/ota-direct.service';
import { ImportHistoricalBaselineUseCase } from '../../application/use-cases/import-historical-baseline.use-case';
import { CreateClientDto } from '../../application/dtos/create-client.dto';
import { UpdateClientDto } from '../../application/dtos/update-client.dto';
import { InsertOtaDataDto } from '../../application/dtos/insert-ota-data.dto';
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
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';

/**
 * Cadeia tenant-scoped das rotas chaveadas por recurso. Declarada por metodo, e
 * nao na classe, porque `GET /clients` e a unica rota do controller que roda
 * deliberadamente sem tenant (listagem cross-tenant via `x-skip-tenant`) e um
 * TenantGuard de classe a quebraria com 400.
 *
 * A ordem e contrato: TenantGuard publica `request.tenant_id`, que
 * ModuleAccessGuard e TenantResourceScopeGuard leem; PermissionsGuard vem por
 * ultimo para enxergar o papel do admin DENTRO do tenant, e nao o global.
 */
const TENANT_SCOPED_CHAIN = [
  AdminJwtGuard,
  TenantGuard,
  ModuleAccessGuard,
  TenantResourceScopeGuard,
  PermissionsGuard,
] as const;

/**
 * Rotas por `:id` de HotelClient (e o POST de criacao, chaveado pelo `tenant_id`
 * do corpo) rodam tenant-scoped: sem isso qualquer admin com
 * `hotel-portal.clients.manage` passava o `:id` de outro cliente e lia, editava
 * ou desativava os dados dele.
 *
 * `GET /clients` continua fora da cadeia: e a listagem global do super admin
 * ("Portal de Clientes"), que o dashboard chama com `x-skip-tenant: true` e sem
 * `x-tenant-id`. Ela nao expoe recurso escolhido pelo chamador — mas tambem nao
 * filtra por tenant para admins comuns, o que segue como buraco conhecido: a
 * correcao exige decidir o que a tela deve mostrar a um manager, nao so mover
 * guards.
 */
@Controller('admin/hotel-portal/clients')
@RequiresModule('client-portal')
@ScopedToTenantResource(
  { kind: 'hotelClient', key: 'id' },
  { kind: 'tenant', key: 'tenant_id', source: 'body' },
)
@RequirePermissions('hotel-portal.clients.manage')
export class AdminHotelClientController {
  constructor(
    private readonly hotelClientService: HotelClientService,
    private readonly otaDirectService: OtaDirectService,
    private readonly importHistoricalBaselineUseCase: ImportHistoricalBaselineUseCase,
  ) {}

  @Post()
  @UseGuards(...TENANT_SCOPED_CHAIN)
  async create(
    @Body() dto: CreateClientDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.hotelClientService.create(dto, admin.admin_id);
    return res.status(result.status).json(result.data);
  }

  // Unica rota fora da cadeia tenant-scoped — ver o comentario da classe.
  @Get()
  @UseGuards(AdminJwtGuard, PermissionsGuard)
  async findAll(
    @Headers('x-skip-tenant') skipTenant: string,
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Res() res: Response,
  ) {
    // x-skip-tenant: true → super admin listing all clients
    if (skipTenant === 'true') {
      const result = await this.hotelClientService.findAll(Number(page), Number(limit));
      return res.status(result.status).json(result.data);
    }

    // x-tenant-id present → return all HotelClients for that tenant
    const tenantId = tenantIdHeader ?? (req as any).tenant_id;
    if (!tenantId) {
      return res.status(400).json({ message: 'Missing x-tenant-id header' });
    }

    const result = await this.hotelClientService.findAllByTenant(tenantId);
    return res.status(result.status).json(result.data);
  }

  @Get(':id')
  @UseGuards(...TENANT_SCOPED_CHAIN)
  async findById(@Param('id') id: string, @Res() res: Response) {
    const result = await this.hotelClientService.findById(id);
    return res.status(result.status).json(result.data);
  }

  @Patch(':id')
  @UseGuards(...TENANT_SCOPED_CHAIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @Res() res: Response,
  ) {
    const result = await this.hotelClientService.update(id, dto);
    return res.status(result.status).json(result.data);
  }

  @Delete(':id')
  @UseGuards(...TENANT_SCOPED_CHAIN)
  @RequirePermissions('hotel-portal.clients.deactivate')
  async deactivate(@Param('id') id: string, @Res() res: Response) {
    const result = await this.hotelClientService.deactivate(id);
    return res.status(result.status).json(result.data);
  }

  @Post(':id/ota-data')
  @UseGuards(...TENANT_SCOPED_CHAIN)
  async insertOtaData(
    @Param('id') clientId: string,
    @Body() dto: InsertOtaDataDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.otaDirectService.insertOtaData(
      { ...dto, client_id: clientId },
      admin.admin_id,
    );
    return res.status(result.status).json(result.data);
  }

  @Post(':id/import-baseline')
  @UseGuards(...TENANT_SCOPED_CHAIN)
  async importBaseline(@Param('id') clientId: string, @Res() res: Response) {
    const result = await this.importHistoricalBaselineUseCase.execute(clientId);
    return res.status(200).json(result);
  }

  @Get(':id/ota-data')
  @UseGuards(...TENANT_SCOPED_CHAIN)
  async getOtaData(
    @Param('id') clientId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();
    const result = await this.otaDirectService.getOtaData(clientId, fromDate, toDate);
    return res.status(result.status).json(result.data);
  }
}
