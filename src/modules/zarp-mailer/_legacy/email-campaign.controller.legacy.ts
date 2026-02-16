import { Body, Controller, Get, Post, Put, Req, Res, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmailCampaignService } from './email-campaign.service';
import UpdateCampaignBatchSizeDTO, { CreateEmailCampaignDTO, CreatePrimaryCopyVariantDTO, EmailCampaignQuery, UpdateCopyVariantDTO } from './email-campaign.dto';
import { Request, Response } from 'express';
import path from 'path';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('Email Campaign')
@Controller()
export class EmailCampaignController {
    public constructor(
        private readonly emailCampaignService: EmailCampaignService
    ) { }

    @Post('/')
    @ApiOperation({ summary: 'Criar campanha de email', description: 'Cria uma nova campanha de email marketing' })
    @ApiResponse({ status: 201, description: 'Campanha criada com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 500, description: 'Erro ao criar campanha' })
    async createEmailCampaign(
        @Body() body: CreateEmailCampaignDTO,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const response = await this.emailCampaignService.createEmailCampaign(body.name);
        return res.status(response.status).json(response.data);
    }

    @Get('/')
    @ApiOperation({ summary: 'Listar campanhas', description: 'Retorna uma lista paginada de campanhas de email' })
    @ApiResponse({ status: 200, description: 'Lista de campanhas com paginação' })
    @ApiResponse({ status: 500, description: 'Erro ao buscar campanhas' })
    async getAllEmailCampaign(
        @Req() req: Request,
        @Res() res: Response,
        @Query() query: EmailCampaignQuery
    ) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 30;

        const response = await this.emailCampaignService.findEmailCampaign({ page, limit });
        return res.status(response.status).json(response.data);
    }

    @Get('/segment-group/:id')
    @ApiOperation({ summary: 'Buscar batches da campanha', description: 'Retorna todos os batches/segmentos de uma campanha específica' })
    @ApiParam({ name: 'id', description: 'ID da campanha', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lista de batches da campanha' })
    @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
    @ApiResponse({ status: 500, description: 'Erro ao buscar batches' })
    async getBatchesByEmailCampaignId(
        @Req() req: Request,
        @Res() res: Response
    ) {
        const response = await this.emailCampaignService.getBatchesByEmailCampaignId(req.params.id);
        return res.status(response.status).json(response.data);
    }

    @Put('/update/copy-variant/:id')
    @ApiOperation({ summary: 'Atualizar tipo de variação de copy', description: 'Atualiza o tipo de variação de copy de uma campanha (AI ou manual)' })
    @ApiParam({ name: 'id', description: 'ID da campanha', type: 'string' })
    @ApiResponse({ status: 200, description: 'Tipo de variação atualizado com sucesso' })
    @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
    @ApiResponse({ status: 500, description: 'Erro ao atualizar' })
    async updateCopyVariant(
        @Req() req: Request,
        @Res() res: Response,
        @Body() body: UpdateCopyVariantDTO
    ) {
        const response = await this.emailCampaignService.updateCopyVariant(req.params.id, body.copy_variation_type);
        return res.status(response.status).json(response.data);
    }

    @Put('/update/campaign-batch-size/:id')
    @ApiOperation({ summary: 'Atualizar tamanho do batch', description: 'Atualiza o tamanho do batch de envios da campanha (mínimo 100)' })
    @ApiParam({ name: 'id', description: 'ID da campanha', type: 'string' })
    @ApiResponse({ status: 200, description: 'Tamanho do batch atualizado com sucesso' })
    @ApiResponse({ status: 400, description: 'Valor inválido (mínimo 100)' })
    @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
    @ApiResponse({ status: 500, description: 'Erro ao atualizar' })
    async updateCampaignBatchSize(
        @Req() req: Request,
        @Res() res: Response,
        @Body() body: UpdateCampaignBatchSizeDTO
    ) {
        const response = await this.emailCampaignService.updateCampaignBatchSize(req.params.id, body.campaign_batch_size);
        return res.status(response.status).json(response.data);
    }

    @Post('/upload-leads/:id')
    @UseInterceptors(FileInterceptor('file', {
        dest: './temp/leads-upload',
        fileFilter: (req, file, cb) => {
            if (
                file.mimetype !== 'text/csv' &&
                file.mimetype !== 'application/vnd.ms-excel'
            ) {
                return cb(new Error('Apenas arquivos CSV são permitidos!'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    }))
    @ApiOperation({ summary: 'Upload de leads CSV', description: 'Faz upload de um arquivo CSV com leads para a campanha (máximo 20MB)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Arquivo CSV com leads'
                }
            }
        }
    })
    @ApiParam({ name: 'id', description: 'ID da campanha', type: 'string' })
    @ApiResponse({ status: 200, description: 'Arquivo processado com sucesso' })
    @ApiResponse({ status: 400, description: 'Arquivo não enviado ou formato inválido' })
    @ApiResponse({ status: 500, description: 'Erro ao processar arquivo' })
    async uploadLeadsCSV(
        @UploadedFile() file: Express.Multer.File,
        @Req() req: Request,
        @Res() res: Response
    ) {
        if (!file) {
            return res.status(400).json({ message: 'Arquivo não enviado ou inválido.' });
        }
        const filePath = path.resolve(file.path);
      
        const uploadInfo = {
            original_name: file.originalname,
            file_name: file.filename,
            file_path: filePath,
            size: file.size,
        };
        const response = await this.emailCampaignService.uploadLeadsCSV(uploadInfo, +req.params.id);
        return res.status(response.status).json(response.data);
    }

    @Post('/primary-copy-variant/create/:id')
    @ApiOperation({ summary: 'Criar variação principal de copy', description: 'Cria o conteúdo principal do email da campanha com validação XSS' })
    @ApiParam({ name: 'id', description: 'ID da campanha', type: 'string' })
    @ApiResponse({ status: 201, description: 'Variação criada com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos ou conteúdo com XSS detectado' })
    @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
    @ApiResponse({ status: 500, description: 'Erro ao criar variação' })
    async createPrimaryCopyVariant(
        @Req() req: Request,
        @Res() res: Response,
        @Body() body: CreatePrimaryCopyVariantDTO
    ) {
        const response = await this.emailCampaignService.createPrimaryCopyVariant(req.params.id, {
            html: body.html,
            md: body.md,
            from_name: body.from_name,
            subject: body.subject,
            use_header: body.use_header,
            use_footer: body.use_footer,
            ...(body.pre_header && { pre_header: body.pre_header })
        });
        return res.status(response.status).json(response.data);
    }

    @Get('/primary-copy-variant/:id')
    @ApiOperation({ summary: 'Buscar variação principal', description: 'Retorna o conteúdo da variação principal de copy da campanha' })
    @ApiParam({ name: 'id', description: 'ID da campanha', type: 'string' })
    @ApiResponse({ status: 200, description: 'Variação encontrada' })
    @ApiResponse({ status: 404, description: 'Variação ou campanha não encontrada' })
    @ApiResponse({ status: 500, description: 'Erro ao buscar variação' })
    async getPrimaryCopyVariant(
        @Req() req: Request,
        @Res() res: Response
    ) {
        const response = await this.emailCampaignService.findPrimaryCopyVariant(req.params.id);
        return res.status(response.status).json(response.data);
    }

    @Post('/close-setup/:id')
    @ApiOperation({ summary: 'Finalizar setup da campanha', description: 'Finaliza a configuração inicial da campanha e a prepara para execução' })
    @ApiParam({ name: 'id', description: 'ID da campanha', type: 'string' })
    @ApiResponse({ status: 200, description: 'Setup finalizado com sucesso' })
    @ApiResponse({ status: 400, description: 'Campanha não está pronta para ser finalizada' })
    @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
    @ApiResponse({ status: 500, description: 'Erro ao finalizar setup' })
    async closeSetup(
        @Req() req: Request,
        @Res() res: Response
    ) {
        const response = await this.emailCampaignService.closeSetup(req.params.id);
        return res.status(response.status).json(response.data);
    }

    @Get('/:id')
    @ApiOperation({ summary: 'Buscar campanha por ID', description: 'Retorna os detalhes completos de uma campanha específica' })
    @ApiParam({ name: 'id', description: 'ID da campanha', type: 'string' })
    @ApiResponse({ status: 200, description: 'Campanha encontrada' })
    @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
    @ApiResponse({ status: 500, description: 'Erro ao buscar campanha' })
    async getEmailCampaignById(
        @Req() req: Request,
        @Res() res: Response
    ) {
        const response = await this.emailCampaignService.getEmailCampaignById(req.params.id);
        return res.status(response.status).json(response.data);
    }
}
