import { Body, Controller, Get, Post, Put, Req, Res, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmailCampaignService } from './email-campaign.service';
import UpdateCampaignBatchSizeDTO, { CreateEmailCampaignDTO, CreatePrimaryCopyVariantDTO, EmailCampaignQuery, UpdateCopyVariantDTO } from './email-campaign.dto';
import { Request, Response } from 'express';
import path from 'path';

@Controller()
export class EmailCampaignController {
    public constructor(
        private readonly emailCampaignService: EmailCampaignService
    ) { }

    @Post('/')
    async createEmailCampaign(
        @Body() body: CreateEmailCampaignDTO,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const response = await this.emailCampaignService.createEmailCampaign(body.name);
        return res.status(response.status).json(response.data);
    }

    @Get('/')
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
    async getBatchesByEmailCampaignId(
        @Req() req: Request,
        @Res() res: Response
    ) {
        const response = await this.emailCampaignService.getBatchesByEmailCampaignId(req.params.id);
        return res.status(response.status).json(response.data);
    }

    @Put('/update/copy-variant/:id')
    async updateCopyVariant(
        @Req() req: Request,
        @Res() res: Response,
        @Body() body: UpdateCopyVariantDTO
    ) {
        const response = await this.emailCampaignService.updateCopyVariant(req.params.id, body.copy_variation_type);
        return res.status(response.status).json(response.data);
    }

    @Put('/update/campaign-batch-size/:id')
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
    async getPrimaryCopyVariant(
        @Req() req: Request,
        @Res() res: Response
    ) {
        const response = await this.emailCampaignService.findPrimaryCopyVariant(req.params.id);
        return res.status(response.status).json(response.data);
    }

    @Post('/close-setup/:id')
    async closeSetup(
        @Req() req: Request,
        @Res() res: Response
    ) {
        const response = await this.emailCampaignService.closeSetup(req.params.id);
        return res.status(response.status).json(response.data);
    }

    @Get('/:id')
    async getEmailCampaignById(
        @Req() req: Request,
        @Res() res: Response
    ) {
        const response = await this.emailCampaignService.getEmailCampaignById(req.params.id);
        return res.status(response.status).json(response.data);
    }
}
