import { Controller, Get, Post, Put, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { EmailCampaignService } from '@/modules/zarp-mailer/application/services';
import {
  CreateEmailCampaignDto,
  EmailCampaignQueryDto,
  UpdateCopyVariantDto,
  UpdateCampaignBatchSizeDto,
} from '@/modules/zarp-mailer/application/dtos';

@ApiTags('Email Campaign')
@Controller()
export class EmailCampaignController {
  constructor(private readonly emailCampaignService: EmailCampaignService) {}

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar campanha de email',
    description: 'Cria uma nova campanha de email marketing em status draft',
  })
  @ApiResponse({ status: 201, description: 'Campanha criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'SMTP server padrão não encontrado' })
  async createEmailCampaign(@Body() dto: CreateEmailCampaignDto) {
    return this.emailCampaignService.createEmailCampaign(dto.name);
  }

  @Get('/')
  @ApiOperation({
    summary: 'Listar campanhas',
    description: 'Retorna uma lista paginada de campanhas de email',
  })
  @ApiResponse({ status: 200, description: 'Lista de campanhas com paginação' })
  async getAllEmailCampaigns(@Query() query: EmailCampaignQueryDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 30;

    return this.emailCampaignService.findEmailCampaigns(page, limit);
  }

  @Get('/:id')
  @ApiOperation({
    summary: 'Buscar campanha por ID',
    description: 'Retorna os detalhes de uma campanha específica',
  })
  @ApiParam({ name: 'id', description: 'ID da campanha', type: 'number' })
  @ApiResponse({ status: 200, description: 'Detalhes da campanha' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  async getEmailCampaignById(@Param('id') id: string) {
    return this.emailCampaignService.getEmailCampaignById(parseInt(id, 10));
  }

  @Put('/:id/copy-variant')
  @ApiOperation({
    summary: 'Atualizar tipo de variação de copy',
    description: 'Atualiza o tipo de variação de copy de uma campanha (AI ou manual)',
  })
  @ApiParam({ name: 'id', description: 'ID da campanha', type: 'number' })
  @ApiResponse({ status: 200, description: 'Tipo de variação atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Operação inválida ou campanha não está em draft' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  async updateCopyVariant(@Param('id') id: string, @Body() dto: UpdateCopyVariantDto) {
    return this.emailCampaignService.updateCopyVariationType(
      parseInt(id, 10),
      dto.copy_variation_type,
    );
  }

  @Put('/:id/batch-size')
  @ApiOperation({
    summary: 'Atualizar tamanho do batch',
    description: 'Atualiza o tamanho do batch de envios da campanha (mínimo 100)',
  })
  @ApiParam({ name: 'id', description: 'ID da campanha', type: 'number' })
  @ApiResponse({ status: 200, description: 'Tamanho do batch atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Valor inválido ou campanha não está em draft' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  async updateCampaignBatchSize(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignBatchSizeDto,
  ) {
    return this.emailCampaignService.updateCampaignBatchSize(
      parseInt(id, 10),
      dto.campaign_batch_size,
    );
  }

  @Post('/:id/close-setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fechar setup da campanha',
    description: 'Finaliza a configuração da campanha e move para status pending',
  })
  @ApiParam({ name: 'id', description: 'ID da campanha', type: 'number' })
  @ApiResponse({ status: 200, description: 'Setup fechado com sucesso' })
  @ApiResponse({ status: 400, description: 'Campanha não está em draft' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  async closeSetup(@Param('id') id: string) {
    return this.emailCampaignService.closeSetup(parseInt(id, 10));
  }

  @Post('/:id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pausar campanha',
    description: 'Pausa uma campanha em execução ou agendada',
  })
  @ApiParam({ name: 'id', description: 'ID da campanha', type: 'number' })
  @ApiResponse({ status: 200, description: 'Campanha pausada com sucesso' })
  @ApiResponse({ status: 400, description: 'Status inválido para pausar' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  async pauseCampaign(@Param('id') id: string) {
    return this.emailCampaignService.pauseCampaign(parseInt(id, 10));
  }

  @Post('/:id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retomar campanha',
    description: 'Retoma uma campanha pausada',
  })
  @ApiParam({ name: 'id', description: 'ID da campanha', type: 'number' })
  @ApiResponse({ status: 200, description: 'Campanha retomada com sucesso' })
  @ApiResponse({ status: 400, description: 'Campanha não está pausada' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  async resumeCampaign(@Param('id') id: string) {
    return this.emailCampaignService.resumeCampaign(parseInt(id, 10));
  }
}
