import { Controller, UseGuards } from "@nestjs/common";
import { EmailCampaignBatchService } from "../../application/services/email-campaign-batch.service";
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';

// Achado de segurança 2026-07-26: controller de disparo de lote sem nenhum guard.
// Hoje sem rotas E não registrado em nenhum módulo (reserve-mailer.module.ts não
// o lista em `controllers`) — não serve requisições. O guard é aplicado por
// defesa em profundidade: se o controller for registrado no futuro (mudança
// funcional separada, fora de escopo aqui), a rota já nasce classificada.
@UseGuards(AdminJwtGuard, RolesGuard)
@Roles(EAdminRole.super_admin)
@Controller()
export class EmailCampaignBatchController {
    public constructor(
        private readonly emailCampaignBatchService: EmailCampaignBatchService
    ) { }


}