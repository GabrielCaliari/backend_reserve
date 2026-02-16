import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards, UsePipes } from '@nestjs/common';
import ListingParamsValidator from '@/common/validators/company/Listing-params.validator';
import ListingQueryParamsValidator from '@/common/validators/company/Listing-query-params.validator';
import { CompanyService } from '../../application/services/company.service';
import { Request, Response } from 'express';
import { UserJwtGuard } from '@/shared/auth/guards';
import ExportValidator from '@/common/validators/company/Export.validator';
import ExportCountValidator from '@/common/validators/company/Export-count.validator';
import { ToLowercaseBodyRequestPipe } from '@/common/pipe/to-lowercase-body-request/to-lowercase-body-request.pipe';
import IdValidator from '@/common/validators/id.validator';
import { Readable } from 'stream';

@Controller('company')
export class CompanyController {
    constructor(
        private readonly companyService: CompanyService,
    ) { }

    @Post('/')
    @UseGuards(UserJwtGuard)
    async list(
        @Query() params: ListingQueryParamsValidator,
        @Body() rows: ListingParamsValidator,
        @Res() res: Response,
        @Req() req: Request & { user_id: number }
    ) {
        const userId = req.user_id;

        const result = await this.companyService.list(
            +params.page || 1,
            +params.limit || 1000,
            +userId,
            {
                cnpj: true,
                branch_type: rows.branch_type ? rows.branch_type : false,
                business_name: rows.business_name ? rows.business_name : false,
                qualification_representative_before_cnpj: rows.qualification_representative_before_cnpj ? rows.qualification_representative_before_cnpj : false,
                // nacimal_simple_option: rows.nacimal_simple_option ? rows.nacimal_simple_option : false,
                // mei_option: rows.mei_option ? rows.mei_option : false,
                // mei_opting_date: rows.mei_opting_date ? rows.mei_opting_date : false,
                federative_entity: rows.federative_entity ? rows.federative_entity : false,
                size: rows.size ? rows.size : false,
                fantasy_name: rows.fantasy_name ? rows.fantasy_name : false,
                social_capital: rows.social_capital ? rows.social_capital : false,
                legal_nature: rows.legal_nature ? rows.legal_nature : false,
                status: rows.status ? rows.status : false,
                date_status: rows.date_status ? rows.date_status : false,
                code_detail_status: rows.code_detail_status ? rows.code_detail_status : false,
                outer_city: rows.outer_city ? rows.outer_city : false,
                coutry_code: rows.coutry_code ? rows.coutry_code : false,
                start_date: rows.start_date ? rows.start_date : false,
                main_cnae: rows.main_cnae ? rows.main_cnae : false,
                secondary_cnae: rows.main_cnae ? rows.main_cnae : false,
                type_of_place: rows.type_of_place ? rows.type_of_place : false,
                place: rows.place ? rows.place : false,
                house_number: rows.house_number ? rows.house_number : false,
                address_complement: rows.address_complement ? rows.address_complement : false,
                district: rows.district ? rows.district : false,
                cep: rows.cep ? rows.cep : false,
                uf: rows.uf ? rows.uf : false,
                city_code: rows.city_code ? rows.city_code : false,
                ddd_1: rows.ddd_1 ? rows.ddd_1 : false,
                phone_1: rows.phone_1 ? rows.phone_1 : false,
                ddd_2: rows.ddd_2 ? rows.ddd_2 : false,
                phone_2: rows.phone_2 ? rows.phone_2 : false,
                ddd_fax: rows.ddd_fax ? rows.ddd_fax : false,
                fax: rows.fax ? rows.fax : false,
                email: rows.email ? rows.email : false,
                special_citation: rows.special_citation ? rows.special_citation : false,
                special_citation_date: rows.special_citation_date ? rows.special_citation_date : false,
                load_update_date: rows.load_update_date ? rows.load_update_date : false,
            },
            {
                ...(params.search_hash ? { search_hash: params.search_hash } : {}),
                ...(params.name ? { name: params.name.toLowerCase() } : {}),
                ...(params.cnae ? { cnae: params.cnae } : {}),
                ...(params.cnae_secondary != undefined && typeof JSON.parse(params.cnae_secondary) == 'boolean' ? { cnae_secondary: JSON.parse(params.cnae_secondary) } : {}),
                ...(params.new_companies != undefined && typeof JSON.parse(params.new_companies) == 'boolean' ? { new_companies: JSON.parse(params.new_companies) } : {}),
                ...(params.recently_closed != undefined && typeof JSON.parse(params.recently_closed) == 'boolean' ? { recently_closed: JSON.parse(params.recently_closed) } : {}),
                ...(params.mei_option != undefined && typeof JSON.parse(params.mei_option) == 'boolean' ? { mei_option: JSON.parse(params.mei_option) } : {}),
                ...(params.nacimal_simple_option != undefined && typeof JSON.parse(params.nacimal_simple_option) == 'boolean' ? { nacimal_simple_option: JSON.parse(params.nacimal_simple_option) } : {}),
                ...(params.branch_type ? { branch_type: +params.branch_type } : {}),
                ...(params.city ? { city: params.city.toLowerCase() } : {}),
                ...(params.uf ? { uf: params.uf.toLowerCase() } : {}),
                ...(params.tax_regime ? { tax_regime: +params.tax_regime } : {}),
                ...(params.size ? { size: params.size } : {}),
                ...(params.status ? { status: params.status } : {}),
            }
        );

        return res.status(result.status).json(result.data);
    }

    @Get('/export/count/:search_hash')
    @UseGuards(UserJwtGuard)
    async count(
        @Param() params: ExportCountValidator,
        @Res() res: Response,
        @Req() req: Request & { user_id: number }
    ) {
        const userId = req.user_id;
        const result = await this.companyService.count({
            ...params,
            user_id: userId
        });
        return res.status(result.status).json(result.data);
    }

    @Post('/export/file/:search_hash')
    @UseGuards(UserJwtGuard)
    async export(
        @Param() { search_hash }: ExportCountValidator,
        @Body() { start }: ExportValidator,
        @Res() res: Response,
        @Req() req: Request & { user_id: number }
    ) {
        const userId = req.user_id;
        const result = await this.companyService.export(
            start,
            userId,
            search_hash,
            start
        );
        return res.status(result.status).json(result.data);
    }

    @Get('/export/file/:id')
    @UseGuards(UserJwtGuard)
    async exportFile(
        @Param() params: IdValidator,
        @Res() res: Response,
        @Req() req: Request & { user_id: number }
    ) {
        const result = await this.companyService.exportFile(+params.id, req.user_id);
        return res.status(result.status).json(result.data);
    }
    @Get('/export/download/:id')
    @UseGuards(UserJwtGuard)
    async downloadExport(
        @Param() params: IdValidator,
        @Res() res: Response,
        @Req() req: Request & { user_id: number }
    ) {
        const result = await this.companyService.downloadExport(+params.id, req.user_id);
        
        if (result.status === 200 && 'filename' in result.data && 'stream' in result.data) {
            try {
                // Set response headers for CSV file download
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="${result.data.filename}"`);
                
                // Convert ReadableStream to Node.js Readable stream and pipe to response
                const nodeStream = Readable.fromWeb(result.data.stream);
                nodeStream.pipe(res);
                return;
            } catch (error) {
                return res.status(500).json({ 
                    status: 500,
                    message: 'Error streaming file',
                    error: error.message
                });
            }
        }
        
        return res.status(result.status).json(result.data);
    }
}
