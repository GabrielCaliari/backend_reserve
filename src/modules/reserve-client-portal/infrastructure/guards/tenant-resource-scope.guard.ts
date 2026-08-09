import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../../shared/database/prisma.service';

export const TENANT_RESOURCE_SCOPE_KEY = 'tenant_resource_scope';

/**
 * De que entidade sai o `tenant_id` dono do recurso pedido:
 * - `tenant`               o valor JA e um tenant id (ex.: `tenant_id` no corpo)
 * - `hotelClient`          id de HotelClient
 * - `hotelGuest`           id de HotelGuest      -> client_id -> tenant_id
 * - `monthlyReport`        id de MonthlyReport   -> client_id -> tenant_id
 * - `whatsAppTrackingLink` id de link            -> client_id -> tenant_id
 * - `digestReport`         id de DigestReport (ja carrega tenant_id)
 */
export type TenantResourceKind =
  | 'tenant'
  | 'hotelClient'
  | 'hotelGuest'
  | 'monthlyReport'
  | 'whatsAppTrackingLink'
  | 'digestReport';

export interface TenantResourceRef {
  kind: TenantResourceKind;
  /** Nome do parametro de rota (ou do campo do corpo, quando `source: 'body'`). */
  key: string;
  source?: 'param' | 'body';
}

/**
 * Declara quais chaves da requisicao apontam para um recurso cujo tenant precisa
 * bater com o tenant da sessao. Referencias cuja chave nao existe na rota sao
 * simplesmente ignoradas — assim um unico decorator de classe cobre controllers
 * com rotas heterogeneas (`:clientId` em umas, `guest/:guestId` em outras).
 */
export const ScopedToTenantResource = (...refs: TenantResourceRef[]) =>
  SetMetadata(TENANT_RESOURCE_SCOPE_KEY, refs);

/**
 * Fecha o IDOR das rotas `admin/hotel-portal/*` chaveadas por id de recurso em
 * vez de por `:tenantId`: sem isso, qualquer admin autenticado com a permissao
 * do modulo passava um `:clientId` de outro cliente e lia os dados dele
 * (managers tem `hotel-portal.clients.manage` na matriz de RBAC).
 *
 * A validacao vive num guard, e nao em cada service, porque as sete familias de
 * rota compartilham exatamente a mesma regra ("o recurso pertence ao tenant da
 * sessao?") e diferem so na chave usada; espalhar isso pelos ~10 services
 * envolvidos duplicaria a regra e deixaria cada rota nova como um novo furo em
 * potencial. Como guard, a regra e declarativa no controller e visivel na
 * cadeia de guards, do mesmo jeito que TenantGuard e ModuleAccessGuard.
 *
 * DEVE rodar depois do TenantGuard — le `request.tenant_id` e `request.admin_role`.
 */
@Injectable()
export class TenantResourceScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const refs = this.reflector.getAllAndOverride<TenantResourceRef[] | undefined>(
      TENANT_RESOURCE_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!refs?.length) return true;

    const request = context.switchToHttp().getRequest();

    // Super admin e cross-tenant por definicao (mesmo desvio que TenantGuard e
    // ModuleAccessGuard ja fazem). E necessario, nao so consistente: na tela
    // "Portal de Clientes" ele abre um cliente qualquer da listagem global, que
    // quase nunca e o tenant selecionado no seletor.
    if (request.admin_role === 'super_admin') return true;

    const tenantId: string | undefined = request.tenant_id;
    if (!tenantId) {
      throw new Error(
        'TenantResourceScopeGuard must run after TenantGuard (request.tenant_id missing)',
      );
    }

    for (const ref of refs) {
      const raw =
        ref.source === 'body' ? request.body?.[ref.key] : request.params?.[ref.key];
      if (raw === undefined || raw === null || raw === '') continue;

      const ownerTenantId = await this.resolveOwnerTenantId(ref.kind, String(raw));

      // HotelClient.tenant_id e nullable: cliente orfao (herdado de antes do
      // multi-tenant, ou de um tenant removido — a FK e ON DELETE SET NULL) nao
      // pertence a tenant nenhum, entao so o super admin acima o alcanca.
      if (ownerTenantId !== tenantId) {
        throw new ForbiddenException('Resource does not belong to the current tenant');
      }
    }

    return true;
  }

  private async resolveOwnerTenantId(
    kind: TenantResourceKind,
    id: string,
  ): Promise<string | null> {
    switch (kind) {
      case 'tenant':
        return id;

      case 'hotelClient': {
        const client = await this.prisma.hotelClient.findUnique({
          where: { id },
          select: { tenant_id: true },
        });
        if (!client) throw new NotFoundException('Hotel client not found');
        return client.tenant_id;
      }

      case 'hotelGuest': {
        const guest = await this.prisma.hotelGuest.findUnique({
          where: { id },
          select: { HotelClient: { select: { tenant_id: true } } },
        });
        if (!guest) throw new NotFoundException('Guest not found');
        return guest.HotelClient.tenant_id;
      }

      case 'monthlyReport': {
        const report = await this.prisma.monthlyReport.findUnique({
          where: { id },
          select: { HotelClient: { select: { tenant_id: true } } },
        });
        if (!report) throw new NotFoundException('Report not found');
        return report.HotelClient.tenant_id;
      }

      case 'whatsAppTrackingLink': {
        const link = await this.prisma.whatsAppTrackingLink.findUnique({
          where: { id },
          select: { HotelClient: { select: { tenant_id: true } } },
        });
        if (!link) throw new NotFoundException('Tracking link not found');
        return link.HotelClient.tenant_id;
      }

      case 'digestReport': {
        const digest = await this.prisma.digestReport.findUnique({
          where: { id },
          select: { tenant_id: true },
        });
        if (!digest) throw new NotFoundException('Digest not found');
        return digest.tenant_id;
      }
    }
  }
}
