import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { UserJwtGuard } from '@/shared/auth/guards';
import { BrandService } from '../../application/services/brand.service';
import CreateValidator from '@/common/validators/brand/Create.validator';
import { Request, Response } from 'express';
import AlertsByBrandNameValidator from '@/common/validators/brand/Alerts-by-brand-name.validator';
import FindBrandValidator from '@/common/validators/company/Find-brand.validator';
import PublicFindBrandValidator from '@/common/validators/company/Public-find-brand.validator';
import ListingQueryParamsValidator from '@/common/validators/company/Listing-query-params.validator';
import PublicBrandFindValidator from '@/common/validators/brand/Public-brand-find.validator';
import CreateLeadValidator from '@/common/validators/brand/Create-lead.validator';

@Controller('brand')
export class BrandController {
    constructor(
        private brandService: BrandService
    ) { }

    @Post('/')
    @UseGuards(UserJwtGuard)
    async create(
        @Body() body: CreateValidator,
        @Res() res: Response,
        @Req() req: Request & { user_id: number }
    ) {
        const userId = req.user_id;
        const result = await this.brandService.create({
            email: body.email,
            name: body.name,
            phone_number: body.phone_number,
            user_id: userId,
            ...(body.identifier ? { identifier: body.identifier } : {}),
            ...(body.inpi_number ? { inpi_number: body.inpi_number } : {})
        });

        return res.status(result.status).json(result.data);
    }

    // @Post('/lead')
    // async createLead(
    //     @Body() body: CreateLeadValidator,
    //     @Res() res: Response,
    //     @Req() req: Request
    // ) {
    //     const result = await this.brandService.createLead({
    //         name: body.name,
    //         ...(body.brand ? { brand: body.brand } : {}),
    //         ...(body.company_on_market ? { ad_company_on_market: body.company_on_market } : {}),
    //         ...(body.company_segment ? { ad_company_segment: body.company_segment } : {}),
    //         ...(body.company_size ? { ad_company_size: body.company_size } : {}),
    //         origin: body.origin,
    //         description: body.description,
    //         phone_number: body.phone_number,
    //         ...(body.origin_font ? { origin_font: body.origin_font } : {}),
    //         ...(body.website ? { website: body.website } : {})
    //     });

    //     return res.status(result.status).json(result.data);
    // }

    @Get('/')
    @UseGuards(UserJwtGuard)
    async findUserBrands(
        @Res() res: Response,
        @Req() req: Request & { user_id: number }
    ) {
        const userId = req.user_id;
        const result = await this.brandService.findUserBrands(userId);
        return res.status(result.status).json(result.data);
    }

    @Post('/public-brand-find/:brand_name')
    async publicBrandFind(
        @Query() params: ListingQueryParamsValidator,
        @Body() row: PublicBrandFindValidator,
        @Param() { brand_name }: PublicFindBrandValidator,
        @Res() res: Response
    ) {
        const result = await this.brandService.publicBrandFind(
            {
                brand_name,
                email: row.email,
                name: row.name,
                radical: row.radical,
                international: row.international
            },
            +params.page || 1,
            10,
        );
        return res.status(result.status).json(result.data);
    }

    @Get('/:brand_id')
    @UseGuards(UserJwtGuard)
    async findBrand(
        @Param() { brand_id }: FindBrandValidator,
        @Res() res: Response,
        @Req() req: Request & { user_id: number }
    ) {
        const userId = req.user_id;
        const result = await this.brandService.findBrand(+brand_id, userId);
        return res.status(result.status).json(result.data);
    }

    // TODO: adicionar validator no parametro :brand_id
    @Get('/alerts-by-brand-name/:brand_id')
    @UseGuards(UserJwtGuard)
    async findAlertsByBrandName(
        @Param() { brand_id }: AlertsByBrandNameValidator,
        @Res() res: Response,
        @Req() req: Request & { user_id: number }
    ) {
        const userId = +req.user_id;
        const result = await this.brandService.findAlertsByBrandName(+brand_id, userId);

        return res.status(result.status).json(result.data);
    }
}
