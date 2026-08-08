import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnalyticsReportService } from '../../application/services/analytics-report.service';
import { LookupReportDto } from '../../application/dtos/lookup-report.dto';
import { Public } from '../../../../shared/auth/decorators/public.decorator';

/**
 * FORA do @RequiresModule('reports') por design, nao por lacuna: a rota e
 * @Public() e nao tem tenant na request, entao o ModuleAccessGuard nao teria
 * politica a consultar. Consta nominalmente na lista de rotas nao-gateaveis em
 * shared/auth/constants/gateable-modules.ts.
 *
 * A resolucao telefone -> URL e global (o telefone e UNIQUE no sistema inteiro)
 * e alcanca tambem os registros legados sem tenant_id.
 */
@ApiTags('Analytics Reports - Public')
@Controller('lookup')
@Public()
export class PublicAnalyticsReportController {
  constructor(private readonly service: AnalyticsReportService) {}

  @Get()
  @ApiOperation({
    summary: 'Look up analytics report URL by phone number',
    description: 'Public endpoint. Returns the report URL associated with the given phone number.',
  })
  @ApiQuery({ name: 'phone', required: true, type: String })
  async lookup(@Query() dto: LookupReportDto) {
    return this.service.lookupByPhone(dto.phone);
  }
}
