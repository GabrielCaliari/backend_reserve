import { ViewCompany } from "@prisma/client";
import { EBranchType, ESize, EStatus } from "src/@types/@company";
import { EStatus as ECompanyExportStatus } from 'src/@types/@company-export'
import RepositoryException from "src/core/exceptions/RepositoryException";
import { convertSearchParamsToSQL, getKeysWithTrueValue } from "src/core/functions";
import prismaClient from "src/core/database/prisma/prismaClient";

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

export interface ICreateCompany {
    cnpj: string;
    branch_type: EBranchType;
    business_name: string | null;
    qualification_representative_before_cnpj: string | null;
    nacimal_simple_option: boolean | null;
    nacimal_simple_opting_date: Date | null;
    mei_option: boolean | null;
    mei_opting_date: Date | null;
    federative_entity: string;
    size: ESize | null;
    fantasy_name: string | null;
    social_capital: number | null;
    legal_nature: string | null;
    status: EStatus | null;
    date_status: Date | null;
    code_detail_status: string;
    outer_city: string | null;
    coutry_code: string | null;
    start_date: Date;
    main_cnae: string;
    secondary_cnae: string[]
    type_of_place: string | null;
    place: string | null;
    house_number: string | null;
    address_complement: string | null;
    district: string | null;
    cep: string | null;
    uf: string | null;
    city_code: string | null;
    ddd_1: string | null;
    phone_1: string | null;
    ddd_2: string | null;
    phone_2: string | null;
    ddd_fax: string | null;
    fax: string | null;
    email: string | null;
    special_citation: string | null;
    special_citation_date: Date | null;
    load_update_date: Date;
}

export interface ICreateCompanyExport {
    total_exported: number;
    company_count: number;
    status: ECompanyExportStatus;
    public_link?: string;
    deletion_date?: Date;
    page: number;
    page_count: number;
    filters: {};
    user_id: number;
}

export default class CompanyRepository {
    async count(where, pag?: { page?, limit, offset?}) {
        try {
            if (where.uf) {
                const limitClause = `LIMIT ${pag && pag.limit ? pag.limit : 1000}`; // Usa o limite da paginação se fornecido
                const offsetClause = pag && pag.page ? `OFFSET ${(pag.page - 1) * (pag.limit || 1000)}` : ''; // Calcula o offset com base na página
                
                const raws = await prismaClient.$queryRawUnsafe(
                    `SELECT count(company_id) FROM ${`"public"."viewcompany_${where.uf.toLocaleLowerCase()}" ${convertSearchParamsToSQL(where)} ${limitClause} ${offsetClause}`}`
                )

                return Number(raws[0].count);
            }

            const raws = await prismaClient.viewCompany.count({
                where,
                ...(pag && pag.page && !pag.offset ? { skip: (pag.page - 1) * pag.limit } : {}),
                ...(pag && pag.offset && !pag.page ? { skip: pag.offset } : {}),
                ...(pag && pag.limit ? { take: pag.limit } : {}),
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao contar o número de empresas.', error);
        }
    }

    async find(
        where: any = {},
        options: {
            select?: ICompanyFields
        }, pag: { page?: number, limit: number, offset?: number } = {
            page: 1,
            limit: 1000
        }
    ) {
        try {
            if (where.uf) {
                const columns = (options.select ? getKeysWithTrueValue(options.select) : ['*']).join(',');
                const limitClause = `LIMIT ${pag && pag.limit ? pag.limit : 1000}`; // Usa o limite da paginação se fornecido
                const offsetClause = pag && pag.page ? `OFFSET ${(pag.page - 1) * (pag.limit || 1000)}` : ''; // Calcula o offset com base na página

                const raws = await prismaClient.$queryRawUnsafe(
                    `SELECT ${columns} FROM ${`"public"."viewcompany_${where.uf.toLocaleLowerCase()}" ${convertSearchParamsToSQL(where)} ${limitClause} ${offsetClause}`}`
                );

                return raws as ViewCompany[];
            }

            const raws = await prismaClient.viewCompany.findMany({
                where,
                ...options,
                ...(pag && pag.page && !pag.offset ? { skip: (pag.page - 1) * pag.limit } : {}),
                ...(pag && pag.offset && !pag.page ? { skip: pag.offset } : {}),
                ...(pag && pag.limit ? { take: pag.limit } : {}),
            });

            return raws.map((raw: any) => {
                return {
                    ...raw
                }
            })
        } catch (error) {
            throw new RepositoryException('Erro ao buscar uma empresa.', error);
        }
    }

    async findWhere(
        {
            where,
            fields = {
                id: true,
                cnpj: true,
                branch_type: true,
                business_name: true,
                qualification_representative_before_cnpj: true,
                nacimal_simple_option: true,
                nacimal_simple_opting_date: true,
                mei_option: true,
                mei_opting_date: true,
                federative_entity: true,
                size: true,
                fantasy_name: true,
                social_capital: true,
                legal_nature: true,
                status: true,
                date_status: true,
                code_detail_status: true,
                outer_city: true,
                coutry_code: true,
                start_date: true,
                main_cnae: true,
                secondary_cnae: true,
                type_of_place: true,
                place: true,
                house_number: true,
                address_complement: true,
                district: true,
                cep: true,
                uf: true,
                city_code: true,
                ddd_1: true,
                phone_1: true,
                ddd_2: true,
                phone_2: true,
                ddd_fax: true,
                fax: true,
                email: true,
                special_citation: true,
                special_citation_date: true,
                load_update_date: true,
            },
            page = 1,
            limit = 100,
        }: {
            where,
            fields: ICompanyFields,
            page: number,
            limit: number
        }
    ) {
        try {
            const raws = this.find(where, {
                select: {
                    ...fields,
                }
            }, {
                limit,
                page
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar uma empresa pelos filtros.', error);
        }
    }

    async findByState(
        {
            uf,
            fields = {
                id: true,
                cnpj: true,
                branch_type: true,
                business_name: true,
                qualification_representative_before_cnpj: true,
                nacimal_simple_option: true,
                nacimal_simple_opting_date: true,
                mei_option: true,
                mei_opting_date: true,
                federative_entity: true,
                size: true,
                fantasy_name: true,
                social_capital: true,
                legal_nature: true,
                status: true,
                date_status: true,
                code_detail_status: true,
                outer_city: true,
                coutry_code: true,
                start_date: true,
                main_cnae: true,
                secondary_cnae: true,
                type_of_place: true,
                place: true,
                house_number: true,
                address_complement: true,
                district: true,
                cep: true,
                uf: true,
                city_code: true,
                ddd_1: true,
                phone_1: true,
                ddd_2: true,
                phone_2: true,
                ddd_fax: true,
                fax: true,
                email: true,
                special_citation: true,
                special_citation_date: true,
                load_update_date: true,
            }
        }: {
            uf: string,
            fields: ICompanyFields,
        }
    ) {
        try {
            const raws = this.find({ uf }, {
                select: {
                    ...fields,
                }
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar uma empresa pelo estado.', error);
        }
    }

    async findByCity(
        {
            cityCode,
            fields = {
                id: true,
                cnpj: true,
                branch_type: true,
                business_name: true,
                qualification_representative_before_cnpj: true,
                nacimal_simple_option: true,
                nacimal_simple_opting_date: true,
                mei_option: true,
                mei_opting_date: true,
                federative_entity: true,
                size: true,
                fantasy_name: true,
                social_capital: true,
                legal_nature: true,
                status: true,
                date_status: true,
                code_detail_status: true,
                outer_city: true,
                coutry_code: true,
                start_date: true,
                main_cnae: true,
                secondary_cnae: true,
                type_of_place: true,
                place: true,
                house_number: true,
                address_complement: true,
                district: true,
                cep: true,
                uf: true,
                city_code: true,
                ddd_1: true,
                phone_1: true,
                ddd_2: true,
                phone_2: true,
                ddd_fax: true,
                fax: true,
                email: true,
                special_citation: true,
                special_citation_date: true,
                load_update_date: true,
            }
        }: {
            cityCode: string,
            fields: ICompanyFields,
        }
    ) {
        try {
            const raws = this.find({ city_code: cityCode }, {
                select: {
                    ...fields,
                }
            });

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar uma empresa pelo estado.', error);
        }
    }

    async createCompanyExport(data: ICreateCompanyExport) {
        try {
            const raw = await prismaClient.companyExport.create({
                data: {
                    ...data
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao cria um registro de exportação de empresas.', error);
        }
    }

    async findCompanyExportById(id: number) {
        try {
            const raw = await prismaClient.companyExport.findUnique({
                where: {
                    id
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar um registro de exportação de empresas.', error);
        }
    }

    async updateCompanyExport(id: number, data: Partial<ICreateCompanyExport>) {
        try {
            const raw = await prismaClient.companyExport.update({
                where: {
                    id
                },
                data: {
                    ...data
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar um registro de exportação de empresas.', error);
        }
    }
}