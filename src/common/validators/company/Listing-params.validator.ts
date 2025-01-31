import { IsBoolean, IsOptional, IsString } from "class-validator";

export default class ListingParamsValidator {
    @IsBoolean()
    @IsOptional()
    branch_type: boolean;

    @IsBoolean()
    @IsOptional()
    business_name: boolean;

    @IsBoolean()
    @IsOptional()
    qualification_representative_before_cnpj: boolean;

    // @IsBoolean()
    // @IsOptional()
    // nacimal_simple_option: boolean;

    // @IsBoolean()
    // @IsOptional()
    // nacimal_simple_opting_date: boolean;

    // @IsBoolean()
    // @IsOptional()
    // mei_option: boolean;

    // @IsBoolean()
    // @IsOptional()
    // mei_opting_date: boolean;

    @IsBoolean()
    @IsOptional()
    federative_entity: boolean;

    @IsBoolean()
    @IsOptional()
    size: boolean;

    @IsBoolean()
    @IsOptional()
    fantasy_name: boolean;

    @IsBoolean()
    @IsOptional()
    social_capital: boolean;

    @IsBoolean()
    @IsOptional()
    legal_nature: boolean;

    @IsBoolean()
    @IsOptional()
    status: boolean;

    @IsBoolean()
    @IsOptional()
    date_status: boolean;

    @IsBoolean()
    @IsOptional()
    code_detail_status: boolean;

    @IsBoolean()
    @IsOptional()
    outer_city: boolean;

    @IsBoolean()
    @IsOptional()
    coutry_code: boolean;

    @IsBoolean()
    @IsOptional()
    start_date: boolean;

    @IsBoolean()
    @IsOptional()
    main_cnae: boolean;

    @IsBoolean()
    @IsOptional()
    secondary_cnae: boolean;

    @IsBoolean()
    @IsOptional()
    type_of_place: boolean;

    @IsBoolean()
    @IsOptional()
    place: boolean;

    @IsBoolean()
    @IsOptional()
    house_number: boolean;

    @IsBoolean()
    @IsOptional()
    address_complement: boolean;

    @IsBoolean()
    @IsOptional()
    district: boolean;

    // @IsBoolean()
    // @IsOptional()
    // partner: boolean;

    @IsBoolean()
    @IsOptional()
    cep: boolean;

    @IsBoolean()
    @IsOptional()
    uf: boolean;

    @IsBoolean()
    @IsOptional()
    city_code: boolean;

    @IsBoolean()
    @IsOptional()
    ddd_1: boolean;

    @IsBoolean()
    @IsOptional()
    phone_1: boolean;

    @IsBoolean()
    @IsOptional()
    ddd_2: boolean;

    @IsBoolean()
    @IsOptional()
    phone_2: boolean;

    @IsBoolean()
    @IsOptional()
    ddd_fax: boolean;

    @IsBoolean()
    @IsOptional()
    fax: boolean;

    @IsBoolean()
    @IsOptional()
    email: boolean;

    @IsBoolean()
    @IsOptional()
    special_citation: boolean;

    @IsBoolean()
    @IsOptional()
    special_citation_date: boolean;

    @IsBoolean()
    @IsOptional()
    load_update_date: boolean;
}