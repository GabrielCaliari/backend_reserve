import { ApiPropertyOptional } from '@nestjs/swagger';

// TODO: Add prioritization for contacts with phone/email
export default class ListingQueryParamsValidator {
    @ApiPropertyOptional({ description: 'Items per page' })
    limit?: number;

    @ApiPropertyOptional({ description: 'Page number' })
    page?: number;

    @ApiPropertyOptional({ description: 'Primary CNAE codes filter', type: [String] })
    cnae?: string[];

    @ApiPropertyOptional({ description: 'Secondary CNAE code filter' })
    cnae_secondary?: string;

    @ApiPropertyOptional({ description: 'State (UF) filter', example: 'SP' })
    uf?: string;

    @ApiPropertyOptional({ description: 'City name filter' })
    city?: string;

    @ApiPropertyOptional({ description: 'Branch type (1: headquarters, 2: branch)' })
    branch_type?: number;

    @ApiPropertyOptional({ description: 'Filter for newly opened companies' })
    new_companies?: string;

    @ApiPropertyOptional({ description: 'Filter for recently closed companies' })
    recently_closed?: string;

    @ApiPropertyOptional({ description: 'Company name search' })
    name?: string;

    @ApiPropertyOptional({ description: 'Tax regime filter' })
    tax_regime?: number;

    @ApiPropertyOptional({ description: 'Company size filter' })
    size?: string;

    @ApiPropertyOptional({ description: 'Search hash identifier for cached results' })
    search_hash?: string;

    @ApiPropertyOptional({ description: 'Company status filter' })
    status?: string;

    @ApiPropertyOptional({ description: 'MEI (individual micro-entrepreneur) option filter' })
    mei_option?: string;

    @ApiPropertyOptional({ description: 'Simples Nacional tax regime option filter' })
    nacimal_simple_option?: string;
}
