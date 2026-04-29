import { Controller, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../domain/enums/admin-role.enum';

// Achado de segurança 2026-07-26: controller administrativo sem nenhum guard.
// Hoje não tem rotas — o guard é aplicado por defesa em profundidade, para que
// qualquer rota futura nasça classificada em vez de aberta por omissão.
@UseGuards(AdminJwtGuard, RolesGuard)
@Roles(EAdminRole.super_admin)
@Controller('email')
export class EmailController {

}
