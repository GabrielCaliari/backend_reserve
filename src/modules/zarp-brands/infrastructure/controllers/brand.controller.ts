import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { UserJwtGuard } from '../../../../shared/auth/guards';
import { BrandService } from '../../application/services/brand.service';
import CreateBrandDTO from '../../application/dtos/create-brand.dto';
import { Request, Response } from 'express';
import AlertsByBrandNameDTO from '../../application/dtos/alerts-by-brand-name.dto';
import FindBrandDTO from '../../application/dtos/find-brand.dto';
import PublicFindBrandDTO from '../../application/dtos/public-find-brand.dto';
import ListingQueryParamsValidator from '../../../../shared/validators/listing-query-params.dto';
import PublicBrandFindDTO from '../../application/dtos/public-brand-find.dto';
import CreateLeadDTO from '../../application/dtos/create-lead.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('Brand')
@Controller('brand')
export class BrandController {
    constructor(
        private brandService: BrandService
    ) { }

    @Post('/')
    @UseGuards(UserJwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new brand' })
    @ApiBody({ type: CreateBrandDTO })
    @ApiResponse({ status: 201, description: 'Brand created successfully' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    async create(
        @Body() body: CreateBrandDTO,
        @Res() res: Response,
        @Req() req: Request & { user_id: string }
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
    //     @Body() body: CreateLeadDTO,
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
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all brands for the authenticated user' })
    @ApiResponse({ status: 200, description: 'User brands returned' })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    async findUserBrands(
        @Res() res: Response,
        @Req() req: Request & { user_id: string }
    ) {
        const userId = req.user_id;
        const result = await this.brandService.findUserBrands(userId);
        return res.status(result.status).json(result.data);
    }

    @Post('/public-brand-find/:brand_name')
    @ApiOperation({ summary: 'Public search for a brand by name' })
    @ApiParam({ name: 'brand_name', description: 'Brand name to search for' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
    @ApiBody({ type: PublicBrandFindDTO })
    @ApiResponse({ status: 200, description: 'Brand search results returned' })
    async publicBrandFind(
        @Query() params: ListingQueryParamsValidator,
        @Body() row: PublicBrandFindDTO,
        @Param() { brand_name }: PublicFindBrandDTO,
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
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get brand details by ID' })
    @ApiParam({ name: 'brand_id', description: 'Brand ID' })
    @ApiResponse({ status: 200, description: 'Brand details returned' })
    @ApiResponse({ status: 404, description: 'Brand not found' })
    async findBrand(
        @Param() { brand_id }: FindBrandDTO,
        @Res() res: Response,
        @Req() req: Request & { user_id: string }
    ) {
        const userId = req.user_id;
        const result = await this.brandService.findBrand(brand_id, userId);
        return res.status(result.status).json(result.data);
    }

    // TODO: add validator for :brand_id param
    @Get('/alerts-by-brand-name/:brand_id')
    @UseGuards(UserJwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get journal alerts for a brand' })
    @ApiParam({ name: 'brand_id', description: 'Brand ID' })
    @ApiResponse({ status: 200, description: 'Brand alerts returned' })
    @ApiResponse({ status: 404, description: 'Brand not found' })
    async findAlertsByBrandName(
        @Param() { brand_id }: AlertsByBrandNameDTO,
        @Res() res: Response,
        @Req() req: Request & { user_id: string }
    ) {
        const userId = req.user_id;
        const result = await this.brandService.findAlertsByBrandName(brand_id, userId);

        return res.status(result.status).json(result.data);
    }
}
