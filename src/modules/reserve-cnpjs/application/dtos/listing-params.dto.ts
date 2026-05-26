import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export default class ListingParamsDTO {
    @ApiPropertyOptional({ description: 'Include branch type' }) @IsBoolean() @IsOptional() branch_type: boolean;
    @ApiPropertyOptional({ description: 'Include business name' }) @IsBoolean() @IsOptional() business_name: boolean;
    @ApiPropertyOptional({ description: 'Include representative qualification before CNPJ' }) @IsBoolean() @IsOptional() qualification_representative_before_cnpj: boolean;
    @ApiPropertyOptional({ description: 'Include federative entity' }) @IsBoolean() @IsOptional() federative_entity: boolean;
    @ApiPropertyOptional({ description: 'Include company size' }) @IsBoolean() @IsOptional() size: boolean;
    @ApiPropertyOptional({ description: 'Include trade name' }) @IsBoolean() @IsOptional() fantasy_name: boolean;
    @ApiPropertyOptional({ description: 'Include share capital' }) @IsBoolean() @IsOptional() social_capital: boolean;
    @ApiPropertyOptional({ description: 'Include legal nature' }) @IsBoolean() @IsOptional() legal_nature: boolean;
    @ApiPropertyOptional({ description: 'Include registration status' }) @IsBoolean() @IsOptional() status: boolean;
    @ApiPropertyOptional({ description: 'Include status date' }) @IsBoolean() @IsOptional() date_status: boolean;
    @ApiPropertyOptional({ description: 'Include detailed status code' }) @IsBoolean() @IsOptional() code_detail_status: boolean;
    @ApiPropertyOptional({ description: 'Include foreign city' }) @IsBoolean() @IsOptional() outer_city: boolean;
    @ApiPropertyOptional({ description: 'Include country code' }) @IsBoolean() @IsOptional() coutry_code: boolean;
    @ApiPropertyOptional({ description: 'Include start date' }) @IsBoolean() @IsOptional() start_date: boolean;
    @ApiPropertyOptional({ description: 'Include main CNAE code' }) @IsBoolean() @IsOptional() main_cnae: boolean;
    @ApiPropertyOptional({ description: 'Include secondary CNAE codes' }) @IsBoolean() @IsOptional() secondary_cnae: boolean;
    @ApiPropertyOptional({ description: 'Include address type' }) @IsBoolean() @IsOptional() type_of_place: boolean;
    @ApiPropertyOptional({ description: 'Include street address' }) @IsBoolean() @IsOptional() place: boolean;
    @ApiPropertyOptional({ description: 'Include house number' }) @IsBoolean() @IsOptional() house_number: boolean;
    @ApiPropertyOptional({ description: 'Include address complement' }) @IsBoolean() @IsOptional() address_complement: boolean;
    @ApiPropertyOptional({ description: 'Include district' }) @IsBoolean() @IsOptional() district: boolean;
    @ApiPropertyOptional({ description: 'Include ZIP code' }) @IsBoolean() @IsOptional() cep: boolean;
    @ApiPropertyOptional({ description: 'Include state (UF)' }) @IsBoolean() @IsOptional() uf: boolean;
    @ApiPropertyOptional({ description: 'Include city code' }) @IsBoolean() @IsOptional() city_code: boolean;
    @ApiPropertyOptional({ description: 'Include area code 1' }) @IsBoolean() @IsOptional() ddd_1: boolean;
    @ApiPropertyOptional({ description: 'Include phone number 1' }) @IsBoolean() @IsOptional() phone_1: boolean;
    @ApiPropertyOptional({ description: 'Include area code 2' }) @IsBoolean() @IsOptional() ddd_2: boolean;
    @ApiPropertyOptional({ description: 'Include phone number 2' }) @IsBoolean() @IsOptional() phone_2: boolean;
    @ApiPropertyOptional({ description: 'Include fax area code' }) @IsBoolean() @IsOptional() ddd_fax: boolean;
    @ApiPropertyOptional({ description: 'Include fax number' }) @IsBoolean() @IsOptional() fax: boolean;
    @ApiPropertyOptional({ description: 'Include email address' }) @IsBoolean() @IsOptional() email: boolean;
    @ApiPropertyOptional({ description: 'Include special citation' }) @IsBoolean() @IsOptional() special_citation: boolean;
    @ApiPropertyOptional({ description: 'Include special citation date' }) @IsBoolean() @IsOptional() special_citation_date: boolean;
    @ApiPropertyOptional({ description: 'Include data load update date' }) @IsBoolean() @IsOptional() load_update_date: boolean;
}
