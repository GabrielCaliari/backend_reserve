import { Injectable } from '@nestjs/common';
import { errorTypes } from 'src/core/error-types';
import { errorResponse, inverterObjeto, separar } from 'src/core/functions';
import CompanyRepository, { ICompanyFields } from './company.repository';
import SearchRepository from './search.repository';
import { Company, Search } from '@prisma/client';
import UserRepository from '../user/user.repository';

import { createWriteStream } from 'fs';
import * as AWS from '@aws-sdk/client-s3';
import * as path from 'path';
import * as fs from 'fs';
import { randomBytes } from 'crypto';
import { format } from 'fast-csv';
import { municipios } from 'src/core/json/municipios';
import prismaClient from 'src/core/prisma/prismaClient';
import { EStatus } from 'src/@types/@company';
import CnaeRepository from '../cnae/cnae.repository';

export interface ISearchParams {
    cnae?: string[]; // TODO: ADICIONAR PARA FILTRAR POR CNAES SECUNDARIOS TAMBEM
    cnae_secondary?: boolean;
    uf?: string; // TODO: corrigir, não está filtrando
    city?: string; // TODO: corrigir, não está filtrando
    branch_type?: number; // TODO: erro ao filtrar, está dando erro 500
    new_companies?: boolean; // TODO: não está funcionando
    recently_closed?: boolean;  // TODO: não está funcionando
    name?: string; // fantasy_name || business_name TODO: colocar para ser indiferente quando for maiusculo e minusculo
    tax_regime?: number; // 1 = Imenes e isentas; 2 = Lucro arbitrado; 3 = Lucro real; 4 = Lucro presumido
    size?: string;
    search_hash?: string;
    status?: string; // TODO: Não está funcionando 
    mei_option?: boolean; // TODO: não está funcionando
    nacimal_simple_option?: boolean;  // TODO: não está funcionando
}

@Injectable()
export class CompanyService {
    constructor(
        private readonly companyRepository: CompanyRepository,
        private readonly searchRepository: SearchRepository,
        private readonly userRepository: UserRepository,
        private readonly cnaeRepository: CnaeRepository
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
                                searchParams.cnae.map(value => +value) :
                                [searchParams.cnae]
                    }
                } : {}),
                ...(searchParams.cnae && searchParams.cnae_secondary ? {
                    secondary_cnae: {
                        in:
                            Array.isArray(searchParams.cnae) ?
                                searchParams.cnae.map(value => +value) :
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
                                mode: 'insensitive'
                            }
                        },
                        {
                            business_name: {
                                contains: searchParams.name,
                                mode: 'insensitive'
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

            const companyCount = await this.companyRepository.count(where);

            if (companyCount == 0) {
                return {
                    status: 200,
                    data: {
                        page,
                        limit,
                        pages: 0,
                        raws: []
                    }
                }
            }

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

            console.log(Math.ceil(+companyCount / +userPlan.maximum_queries_to_export))

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

            const fileName = randomBytes(32).toString('hex').slice(0, 32);
            const filePath = path.join(__dirname, '..', '..', '..', '..', 'temp', `${fileName}.csv`)
            const writeStream = createWriteStream(filePath);

            const csvStream = format({ headers: true });
            csvStream.pipe(writeStream);

            let totalRecordsProcessed = 0;
            let hasMoreRecords = true;

            const pageCount = await this.companyRepository.count(
                JSON.parse(search.filters as string),
                {
                    offset: +offset,
                    limit: userPlan.maximum_queries_to_export
                }
            );

            const company = await this.companyRepository.find(
                JSON.parse(search.filters as string),
                {
                    select: {
                        cnpj: true,
                        business_name: true,
                        // cep: true,
                        // address_complement: true,
                        // branch_type: true,
                        // city_code: true,
                        // code_detail_status: true,
                        // coutry_code: true,
                        // date_status: true,
                        // ddd_1: true,
                        // ddd_2: true,
                        // ddd_fax: true,
                        // district: true,
                        // email: true,
                        // fantasy_name: true,
                        // fax: true,
                        // federative_entity: true,
                        // house_number: true,
                        // id: true,
                        // legal_nature: true,
                        // load_update_date: true,
                        // Main_cnae: true,
                        // main_cnae_id: true,
                        // mei_opting_date: true,
                        // mei_option: true,
                        // nacimal_simple_opting_date: true,
                        // nacimal_simple_option: true,
                        // outer_city: true,
                        // phone_1: true,
                        // phone_2: true,
                        // place: true,
                        // qualification_representative_before_cnpj: true,
                        // SecondaryCnae: true,
                        // size: true,
                        // social_capital: true,
                        // special_citation: true,
                        // special_citation_date: true,
                        // start_date: true,
                        // status: true,
                        // type_of_place: true,
                        // uf: true,
                    }
                },
                {
                    offset: +offset,
                    limit: userPlan.maximum_queries_to_export
                }
            );

            const packages = separar(company, 1000);

            // TODO: otimizar
            packages.forEach((_package: any[]) => {
                let data = '';

                _package.forEach(item => {
                    data += `${[
                        item.cnpj, // as cnpj
                        item.business_name, // Razão social
                        item.fantasy_name, // nome fantasia
                        (item.start_date ? item.start_date.toLocaleDateString() : ''), // Data de inicio
                        item.Main_cnae.code, // CNAE Principal
                        (item.SecondaryCnae && Array.isArray(item.SecondaryCnae) ? item.SecondaryCnae.map((cnae) => cnae.Cnae.code).join(',') : ''), // Cnae secundario
                        (item.ddd_1 ? `${item.ddd_1} ${item.phone_1}` : ''), // telefone
                        (item.ddd_2 ? `${item.ddd_2} ${item.phone_2}` : ''), // telefone
                        (item.ddd_fax ? `${item.ddd_fax} ${item.fax}` : ''), // fax
                        item.email, // email
                        item.branch_type, // Matriz/Filial
                        item.cep, // CEP
                        item.type_of_place, // Tipo local
                        item.place, // local
                        item.district, // bairro
                        item.uf, // UF
                        item.city_code, // código da cidade 
                        item.qualification_representative_before_cnpj, // Qualificação do representando do CNPJ (código)
                        item.nacimal_simple_option, // optante pelo simples nacional
                        (item.nacimal_simple_opting_date ? item.nacimal_simple_opting_date.toLocaleDateString() : ''), // data optante pelo simples
                        item.mei_option, // optante pelo MEI
                        (item.mei_non_option_date ? item.mei_non_option_date.toLocaleDateString() : ''), // não optante pelo MEI data
                        (item.mei_opting_date ? item.mei_opting_date.toLocaleDateString() : ''), // data optante pelo MEI
                        item.federative_entity,  // entidade federativa
                        item.size, // porte da empresa
                        item.social_capital, // capital social
                        item.legal_nature, // natureza legal
                        item.status, // status da empresa
                        (item.date_status ? item.date_status.toLocaleDateString() : ''), // data do status
                        item.code_detail_status, // Código detalhes status
                        item.outer_city, // Cidade do exterior
                        item.coutry_code, // Código do pais
                        (item.load_update_date ? item.load_update_date.toLocaleDateString() : ''),
                        item.special_citation, // sitaucao espcial
                        (item.special_citation_date ? item.special_citation_date.toLocaleDateString() : ''), // sitaucao espcial data
                    ].join(";")}\n`;
                });

                fs.appendFileSync(filePath, data, { encoding: 'utf-8' })
            })

            csvStream.end();

            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            return {
                status: 200,
                data: {
                    message: 'Arquivo CSV gerado com sucesso',
                    filePath: filePath,
                    totalRecordsProcessed: totalRecordsProcessed
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.company_not_exported, 500, error);
        }
    }
}
