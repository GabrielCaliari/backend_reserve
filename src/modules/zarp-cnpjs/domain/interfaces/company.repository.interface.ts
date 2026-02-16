export interface ICompanyFields {
    id?: boolean;
    cnpj: boolean;
    branch_type?: boolean;
    business_name?: boolean;
    qualification_representative_before_cnpj?: boolean;
    nacimal_simple_option?: boolean;
    nacimal_simple_opting_date?: boolean;
    mei_option?: boolean;
    mei_opting_date?: boolean;
    federative_entity?: boolean;
    size?: boolean;
    fantasy_name?: boolean;
    social_capital?: boolean;
    legal_nature?: boolean;
    status?: boolean;
    date_status?: boolean;
    code_detail_status?: boolean;
    outer_city?: boolean;
    coutry_code?: boolean;
    start_date?: boolean;
    main_cnae?: boolean;
    secondary_cnae?: boolean;
    type_of_place?: boolean;
    place?: boolean;
    house_number?: boolean;
    address_complement?: boolean;
    district?: boolean;
    cep?: boolean;
    uf?: boolean;
    city_code?: boolean;
    ddd_1?: boolean;
    phone_1?: boolean;
    ddd_2?: boolean;
    phone_2?: boolean;
    ddd_fax?: boolean;
    fax?: boolean;
    email?: boolean;
    special_citation?: boolean;
    special_citation_date?: boolean;
    load_update_date?: boolean;
}

export interface ICreateCompanyExport {
    total_exported: number;
    company_count: number;
    status: number;
    public_link?: string;
    deletion_date?: Date;
    page: number;
    page_count: number;
    filters: {};
    user_id: number;
}

export interface ICompanyRepository {
    count(where: any, pag?: { page?: number; limit: number; offset?: number }): Promise<number>;
    find(where: any, options: { select?: ICompanyFields }, pag: any): Promise<any[]>;
    findWhere(params: { where: any; fields: ICompanyFields; page: number; limit: number }): Promise<any[]>;
    findByState(params: { uf: string; fields: ICompanyFields }): Promise<any[]>;
    findByCity(params: { cityCode: string; fields: ICompanyFields }): Promise<any[]>;
    createCompanyExport(data: ICreateCompanyExport): Promise<any>;
    findCompanyExportById(id: number): Promise<any>;
    updateCompanyExport(id: number, data: Partial<ICreateCompanyExport>): Promise<any>;
}

export const COMPANY_REPOSITORY = Symbol('COMPANY_REPOSITORY');
