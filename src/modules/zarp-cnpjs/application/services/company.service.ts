import { Inject, Injectable } from '@nestjs/common';
import { errorTypes } from '@/shared/constants/error-types';
import { errorResponse, inverterObjeto, separar } from '@/shared/helpers';
import {
    ICompanyRepository,
    ICompanyFields,
    COMPANY_REPOSITORY,
    ISearchRepository,
    SEARCH_REPOSITORY,
    ICnaeRepository,
    CNAE_REPOSITORY,
} from '../../domain/interfaces';
import { Company, Search } from '@/generated/prisma/client';
import UserRepository from '@/modules/zarp-auth/infrastructure/repositories/user.repository';
import { EStatus as ECompanyExportStatus } from '@/modules/zarp-cnpjs/domain/enums/company-export-status.enum'

import { createWriteStream } from 'fs';
import * as AWS from '@aws-sdk/client-s3';
import * as path from 'path';
import * as fs from 'fs';
import { randomBytes } from 'crypto';
import { format } from 'fast-csv';
import { municipios } from '@/shared/data/municipios';

import { EStatus } from '@/modules/zarp-cnpjs/domain/enums/company.enum';

export interface ISearchParams {
    cnae?: string[]; // TODO: ADICIONAR PARA FILTRAR POR CNAES SECUNDARIOS TAMBEM
    cnae_secondary?: boolean;
    uf?: string; // TODO: corrigir, nÃ£o estÃ¡ filtrando
    city?: string; // TODO: corrigir, nÃ£o estÃ¡ filtrando
    branch_type?: number; // TODO: erro ao filtrar, estÃ¡ dando erro 500
    new_companies?: boolean; // TODO: nÃ£o estÃ¡ funcionando
    recently_closed?: boolean;  // TODO: nÃ£o estÃ¡ funcionando
    name?: string; // fantasy_name || business_name TODO: colocar para ser indiferente quando for maiusculo e minusculo
    tax_regime?: number; // 1 = Imenes e isentas; 2 = Lucro arbitrado; 3 = Lucro real; 4 = Lucro presumido
    size?: string;
    search_hash?: string;
    status?: string; // TODO: NÃ£o estÃ¡ funcionando 
    mei_option?: boolean; // TODO: nÃ£o estÃ¡ funcionando
    nacimal_simple_option?: boolean;  // TODO: nÃ£o estÃ¡ funcionando
}

@Injectable()
export class CompanyService {
    constructor(
        @Inject(COMPANY_REPOSITORY)
        private readonly companyRepository: ICompanyRepository,
        @Inject(SEARCH_REPOSITORY)
        private readonly searchRepository: ISearchRepository,
        private readonly userRepository: UserRepository,
        @Inject(CNAE_REPOSITORY)
        private readonly cnaeRepository: ICnaeRepository,
    ) { }

    private readonly s3Client = new AWS.S3({
        endpoint: process.env.JOURNAL_BUCKET_ENDPOINT,
        credentials: {
            accessKeyId: process.env.JOURNAL_BUCKET_ACCESS_KEY_ID,
            secretAccessKey: process.env.JOURNAL_BUCKET_SECRET_ACCESS_KEY,
        },
        region: process.env.JOURNAL_BUCKET_REGION,
    });

    async list(
        page: number,
        limit: number,
        userId: number,
        rows: ICompanyFields =
            {
                cnpj: true,
                address_complement: true,
                branch_type: true,
                business_name: true,
                cep: true,
                city_code: true,
                code_detail_status: true,
                coutry_code: true,
                date_status: true,
                ddd_1: true,
                ddd_2: true,
                ddd_fax: true,
                district: true,
                email: true,
                fantasy_name: true,
                fax: true,
                federative_entity: true,
                house_number: true,
                id: true,
                legal_nature: true,
                load_update_date: true,
                main_cnae: true,
                secondary_cnae: true,
                mei_opting_date: true,
                mei_option: true,
                nacimal_simple_opting_date: true,
                nacimal_simple_option: true,
                outer_city: true,
                phone_1: true,
                phone_2: true,
                place: true,
                qualification_representative_before_cnpj: true,
                size: true,
                social_capital: true,
                special_citation: true,
                special_citation_date: true,
                start_date: true,
                status: true,
                type_of_place: true,
                uf: true,
            },
        searchParams?: ISearchParams,
    ) {
        try {
            if (Object.keys(rows).length == 0) {
                rows.cnpj = true;
            }

            if (searchParams.city) {
                searchParams.city = inverterObjeto(municipios)[searchParams.city];
            }

            const now = new Date();

            const where = {
                ...(searchParams.cnae ? {
                    main_cnae: {
                        in:
                            Array.isArray(searchParams.cnae) ?
                                searchParams.cnae.map(value => value) :
                                [searchParams.cnae]
                    }
                } : {}),
                ...(searchParams.cnae && searchParams.cnae_secondary ? {
                    secondary_cnae: {
                        in:
                            Array.isArray(searchParams.cnae) ?
                                searchParams.cnae.map(value => value) :
                                [searchParams.cnae]
                    }
                } : {}),
                ...(searchParams.uf ? {
                    uf: searchParams.uf.toLocaleLowerCase(),
                } : {}),
                ...(searchParams.city ? {
                    city_code: searchParams.city
                } : {}),
                ...(searchParams.branch_type ? { branch_type: searchParams.branch_type } : {}),
                ...(searchParams.name ? {
                    OR: [
                        {
                            fantasy_name: {
                                contains: searchParams.name,
                            }
                        },
                        {
                            business_name: {
                                contains: searchParams.name,
                            }
                        }
                    ]
                } : {}),
                ...(searchParams.tax_regime ? {

                } : {}),
                ...(searchParams.size ? { size: searchParams.size } : {}),
                ...(
                    searchParams.mei_option ? {
                    } : {}
                ),
                ...(
                    searchParams.nacimal_simple_option ? {
                    } : {}
                ),
                ...(
                    searchParams.status ? {
                        status: searchParams.status
                    } : {}
                ),
                ...(
                    searchParams.new_companies ? {
                        start_date: {
                            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                            lte: new Date(now.getFullYear(), now.getMonth(), 0),
                        }
                    } : {}
                ),
                ...(
                    searchParams.recently_closed ? {
                        status: EStatus.baixada,
                        date_status: {
                            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                            lte: new Date(now.getFullYear(), now.getMonth(), 0),
                        }
                    } : {}
                )
            };

            const companyCount = 1000;
            // const companyCount = await this.companyRepository.count(where);

            // if (companyCount == 0) {
            //     return {
            //         status: 200,
            //         data: {
            //             page,
            //             limit,
            //             pages: 0,
            //             raws: []
            //         }
            //     }
            // }

            let search!: Search;
            let itsPage = false;
            if (searchParams.search_hash) {
                search = await this.searchRepository.findByHash(searchParams.search_hash);

                if (
                    search &&
                    search.user_id == userId &&
                    JSON.stringify(where) == search.filters
                ) {
                    itsPage = true;
                }
            }

            const user = await this.userRepository.selectById(userId, {
                Plan: true
            });

            const maxSearches = user.Plan.maximum_queries;
            const countSearches = await this.searchRepository.countUserMonth(user.id);

            if (maxSearches != 999 && countSearches >= maxSearches) {
                return {
                    status: 403,
                    data: {
                        code: errorTypes._403.search_limit_reached
                    }
                }
            }

            const pages =
                Math.ceil(
                    companyCount / limit
                );

            const cnaes = await this.cnaeRepository.find();

            const raws = (await this.companyRepository.find(where, {
                ...(rows ? { select: rows } : {}),
            }, {
                limit,
                page
            }))

            if (!itsPage) {
                search = await this.searchRepository.create({
                    amount: companyCount,
                    filters: JSON.stringify(where),
                    limit: limit,
                    user_id: userId
                });
            }

            return {
                status: 200,
                data: {
                    search_hash: search.hash,
                    page,
                    limit,
                    pages,
                    raws: raws.map((raw) => {
                        const cnae = cnaes.find(cnae => cnae.code === raw.main_cnae);
                        const secondaryCnae = cnaes.filter(cnae => raw.secondary_cnae ? raw.secondary_cnae.split(',').find(sub_raw => sub_raw == cnae.code) : [])

                        return {
                            ...raw,
                            partner: [],
                            main_cnae: cnae ? {
                                code: cnae.code,
                                name: cnae.name
                            } : {},
                            secondary_cnae: secondaryCnae.map(cnae => {
                                return {
                                    code: cnae.code,
                                    name: cnae.name,
                                }
                            })
                        }
                    })
                }
            }
        } catch (error) {
            console.log(error)
            return errorResponse(errorTypes._500.company_not_listed, 500);
        }
    }

    async count({ search_hash, user_id }: { search_hash: string, user_id: number }) {
        try {
            const search = await this.searchRepository.findByHash(search_hash);

            if (!search || search.user_id != user_id) {
                return errorResponse(errorTypes._400.search_nf, 400);
            }

            const companyCount = await this.companyRepository.count(JSON.parse(search.filters as string));

            const userPlan = (await this.userRepository.selectById(user_id, { Plan: true })).Plan

            return {
                status: 200,
                data: {
                    companies: companyCount,
                    pages: userPlan.maximum_queries_to_export ? Math.ceil(+companyCount / +userPlan.maximum_queries_to_export) : 0
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.company_not_counted, 500, error);
        }
    }

    async export(
        start: number,
        userId: number,
        searchHash: string,
        page: number
    ) {
        try {
            const search = await this.searchRepository.findByHash(searchHash);

            if (!search || search.user_id != userId) {
                return errorResponse(errorTypes._400.search_nf, 400);
            }

            const companyCount = await this.companyRepository.count(JSON.parse(search.filters as string));
            const userPlan = (await this.userRepository.selectById(userId, { Plan: true })).Plan

            const offset = (page - 1) * userPlan.maximum_queries_to_export;
            const pages = userPlan.maximum_queries_to_export ? Math.ceil(+companyCount / +userPlan.maximum_queries_to_export) : 0;

            if (page > pages) {
                return errorResponse(errorTypes._400.page_out_of_range, 400);
            }

            const pageCount = await this.companyRepository.count(
                JSON.parse(search.filters as string),
                {
                    offset: +offset,
                    limit: userPlan.maximum_queries_to_export
                }
            );

            const companyExport = await this.companyRepository.createCompanyExport({
                company_count: companyCount,
                total_exported: userPlan.maximum_queries_to_export,
                filters: search.filters,
                status: ECompanyExportStatus.pending,
                user_id: userId,
                page_count: pageCount,
                page: start,
            });

            this.processExport(companyExport.id);

            return {
                status: 200,
                data: {
                    id: companyExport.id
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.company_not_exported, 500, error);
        }
    }

    async processExport(
        exportId: number
    ) {
        const fileName = randomBytes(32).toString('hex').slice(0, 32);
        const filePath = path.join(__dirname, '..', '..', '..', '..', 'temp', `${fileName}.csv`)

        try {
            const companyExport = await this.companyRepository.findCompanyExportById(exportId);

            if (!companyExport.id) {
                throw `Empresa buscada pelo ID ${exportId} nÃ£o foi encontrada pelo mÃ©todo findCompanyExportById`;
            }

            const writeStream = createWriteStream(filePath);

            const csvStream = format({ headers: true });
            csvStream.pipe(writeStream);

            const paginationLimit = 10000;
            const paginationOffset = companyExport.page == 1 ? 1 : (companyExport.total_exported) / ((companyExport.page) * paginationLimit) * 2;
            const offset = paginationOffset;

            const companies = await Promise.all(Array.from({ length: Math.ceil((companyExport.total_exported / paginationLimit)) }).map(async (value, index) => {
                const companies = await this.companyRepository.find(
                    JSON.parse(companyExport.filters as string),
                    {
                        select: {
                            cnpj: true,
                            branch_type: true,
                            business_name: true,
                            status: true,
                            date_status: true,
                            code_detail_status: true,
                            outer_city: true,
                            coutry_code: true,
                            start_date: true,
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
                            main_cnae: true,
                            secondary_cnae: true,
                            fantasy_name: true,
                            legal_nature: true,
                            qualification_representative_before_cnpj: true,
                            social_capital: true,
                            size: true,
                            federative_entity: true,
                        }
                    },
                    {
                        page: (+offset + index + 1),
                        limit: companyExport.total_exported <= paginationLimit ? companyExport.total_exported : paginationLimit
                    }
                );

                return companies;
            }));

            companies.flat().forEach(company => {
                csvStream.write({
                    'CNPJ': company.cnpj,
                    'Tipo de Filial': company.branch_type,
                    'RazÃ£o Social': company.business_name,
                    'Status': company.status,
                    'Data do Status': company.date_status ? new Date(company.date_status).toLocaleDateString('pt-BR') : '',
                    'CÃ³digo Detalhado do Status': company.code_detail_status,
                    'Cidade Exterior': company.outer_city,
                    'CÃ³digo do PaÃ­s': company.coutry_code,
                    'Data de InÃ­cio': company.start_date ? new Date(company.start_date).toLocaleDateString('pt-BR') : '',
                    'Tipo de Logradouro': company.type_of_place,
                    'Logradouro': company.place,
                    'NÃºmero': company.house_number,
                    'Complemento': company.address_complement,
                    'Bairro': company.district,
                    'CEP': company.cep,
                    'UF': company.uf,
                    'CÃ³digo da Cidade': company.city_code,
                    'DDD 1': company.ddd_1,
                    'Telefone 1': company.phone_1,
                    'DDD 2': company.ddd_2,
                    'Telefone 2': company.phone_2,
                    'DDD Fax': company.ddd_fax,
                    'Fax': company.fax,
                    'Email': company.email,
                    'CitaÃ§Ã£o Especial': company.special_citation,
                    'Data da CitaÃ§Ã£o Especial': company.special_citation_date ? new Date(company.special_citation_date).toLocaleDateString('pt-BR') : '',
                    'Data de AtualizaÃ§Ã£o': company.load_update_date ? new Date(company.load_update_date).toLocaleDateString('pt-BR') : '',
                    'CNAE Principal': company.main_cnae,
                    'CNAEs SecundÃ¡rios': company.secondary_cnae,
                    'Nome Fantasia': company.fantasy_name,
                    'Natureza JurÃ­dica': company.legal_nature,
                    'QualificaÃ§Ã£o do Representante': company.qualification_representative_before_cnpj,
                    'Capital Social': company.social_capital,
                    'Porte': company.size,
                    'Entidade Federativa': company.federative_entity,
                });
            });
            csvStream.end();

            await new Promise<void>((resolve, reject) => {
                writeStream.on('finish', () => resolve());
                writeStream.on('error', reject);
            });

            const s3FileName = `exports/${fileName}.csv`;
            const link = `${process.env.UPLOAD_BUCKET_ENDPOINT}/${process.env.UPLOAD_BUCKET_NAME}/${s3FileName}`;

            await this.s3Client.putObject({
                Bucket: process.env.UPLOAD_BUCKET_NAME,
                Key: s3FileName,
                Body: fs.createReadStream(filePath)
            });

            fs.unlinkSync(filePath);
            
            await this.companyRepository.updateCompanyExport(exportId, {
                status: ECompanyExportStatus.completed,
                public_link: link,
            });

            return {
                status: 200,
                data: {
                    uri: link
                }
            };
        } catch (error) {
            // Clean up temp file if it exists
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            await this.companyRepository.updateCompanyExport(exportId, {
                status: ECompanyExportStatus.failed,
            });

            return errorResponse(errorTypes._500.company_not_exported, 500, error);
        }
    }

    async downloadExport(exportId: number, userId: number) {
        try {
            const companyExport = await this.companyRepository.findCompanyExportById(exportId);
    
            if (!companyExport || companyExport.user_id !== userId) {
                return errorResponse(errorTypes._403.unauthorized_access, 403);
            }
    
            if (!companyExport || companyExport.user_id !== userId) {
                return errorResponse(errorTypes._403.unauthorized_access, 403);
            }
    
            if (companyExport.status !== ECompanyExportStatus.completed || !companyExport.public_link) {
                return errorResponse(errorTypes._400.export_not_ready, 400);
            }
    
            const fileKey = companyExport.public_link.split('/').pop();
            const getObjectCommand = new AWS.GetObjectCommand({
                Bucket: process.env.UPLOAD_BUCKET_NAME,
                Key: `exports/${fileKey}`
            });

            const item = await this.s3Client.send(getObjectCommand);

            if (!item.Body) {
                return errorResponse(errorTypes._404.file_not_found, 404);
            }

            return {
                status: 200,
                data: {
                    stream: item.Body.transformToWebStream(),
                    filename: fileKey,
                    contentType: 'text/csv'
                }
            };
        } catch (error) {
            return errorResponse(errorTypes._500.export_download_error, 500, error);
        }
    }

    async exportFile(exportId: number, userId: number) {
        try {
            const companyExport = await this.companyRepository.findCompanyExportById(exportId);

            if (!companyExport || companyExport.user_id !== userId) {
                return errorResponse(errorTypes._403.unauthorized_access, 403);
            }

            return {
                status: 200,
                data: {
                    status: companyExport.status,
                    public_link: companyExport.public_link,
                    created_at: companyExport.created_at,
                    company_count: companyExport.company_count,
                    total_exported: companyExport.total_exported,
                    page: companyExport.page,
                    page_count: companyExport.page_count
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.export_status_error, 500, error);
        }
    }
}
