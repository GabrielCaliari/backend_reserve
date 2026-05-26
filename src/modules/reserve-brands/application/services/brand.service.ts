import { errorTypes } from '../../../../shared/constants/error-types';
import { errorResponse, separarPorPropriedade } from '../../../../shared/helpers';
import {
    IBrandRepository,
    IBrandAlertRepository,
    IBrandMonitoringRepository,
    IBrandFields,
    BRAND_REPOSITORY,
    BRAND_ALERT_REPOSITORY,
    BRAND_MONITORING_REPOSITORY,
} from '../../domain/interfaces';

import { Inject, Injectable } from '@nestjs/common';
// Cross-context repositories (temporary)
import JournalAlertRepository from '../../../reserve-journals/infrastructure/repositories/journal-alert.repository';
import BrandNotificationRepository from '../../infrastructure/repositories/brand-notification.repository';
import { EBrandMonitoring } from '../../domain/enums/brand-monitoring-status.enum';
import { JournalAlert, PrismaClient } from '../../../../generated/prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import PlanRepository from '../../../reserve-auth/infrastructure/repositories/plan.repository';
import { EStatus } from '../../../reserve-auth/domain/enums/plan-status.enum';
import PublicBrandSearchRepository from '../../infrastructure/repositories/public-brand-search.repository';
import { EuipoAPITokenProvider } from '../../infrastructure/providers/euipo-api-token.provider';
import axios from 'axios';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class BrandService {
    constructor(
        @Inject(BRAND_REPOSITORY) private readonly brandRepository: IBrandRepository,
        private readonly journalAlertRepository: JournalAlertRepository,
        private readonly planRepository: PlanRepository,
        @Inject(BRAND_MONITORING_REPOSITORY) private readonly brandMonitoringRepository: IBrandMonitoringRepository,
        @Inject(BRAND_ALERT_REPOSITORY) private readonly brandAlertRepository: IBrandAlertRepository,
        private readonly publicBrandSearchRepository: PublicBrandSearchRepository,
        private readonly euipoAPIToken: EuipoAPITokenProvider,
        private readonly prisma: PrismaService,
        // private readonly leadRepository: LeadRepository,
    ) { }

    async create(data: Omit<IBrandFields, 'id'>) {
        try {
            const brandByNameAndUserId = await this.brandRepository.findByNameAndUser(data.name, data.user_id);

            if (brandByNameAndUserId) {
                return errorResponse(errorTypes._400.brand_alr_ex, 400);
            }

            const plans = await this.planRepository.selectAvailableMonitoringPlanByUser(data.user_id);

            if (plans.length <= 0) {
                return errorResponse(errorTypes._400.has_no_moni_plan, 400);
            }

            const result = await this.prisma.$transaction(async (rx: PrismaClient) => {
                const result = await this.brandRepository.create(data, rx);

                await this.planRepository.linkMonitoringPlanWithBrand(plans[0].id, result.id, rx);

                await this.brandMonitoringRepository.create({
                    brand_id: result.id,
                    status: EBrandMonitoring.pending,
                    user_id: result.user_id,
                    ...(data.inpi_number ? { inpi_number: data.inpi_number } : {})
                }, rx);

                return result;
            });

            this.brandMonitoring(data.user_id);

            return {
                status: 200,
                data: {
                    id: result.id,
                    name: result.name
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.brand_not_created, 500);
        }
    }

    // async createLead(data: ICreateLead) {
    //     try {
    //         const result = await this.leadRepository.create({
    //             ...data
    //         })

    //         return {
    //             status: 200,
    //             data: {
    //                 id: result.id,
    //             }
    //         }
    //     } catch (error) {
    //         return errorResponse(errorTypes._500.registration_lead, 500, error);
    //     }
    // }

    async findUserBrands(userId: string) {
        try {
            const brands = await this.brandRepository.find(
                {
                    MonitoringPlan: {
                        some: {
                            status: EStatus.active
                        }
                    },
                    user_id: userId,
                }, {}
            );

            return {
                status: 200,
                data: brands
            }
        } catch (error) {
            return errorResponse(errorTypes._500.find_alerts_by_brand_name, 500, error);
        }
    }

    async findAlertsByBrandName(brandId: string, userId: string, lastMagazine: string | null = null) {
        try {
            const brand = await this.brandRepository.findById(brandId);

            if (!brand || brand.user_id != userId) {
                return errorResponse(errorTypes._404.brand_nf_user, 404);
            }

            const alerts = await this.journalAlertRepository.findByBrandName(brand.name);

            return {
                status: 200,
                data: {
                    brand: {
                        brand_name: brand.name,
                        email: brand.email,
                        phone_number: brand.phone_number,
                        inpi_number: brand.inpi_number,
                    },
                    alerts: alerts
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.find_alerts_by_brand_name, 500, error);
        }
    }

    async findBrand(brandId: string, userId: string) {
        try {
            const brand = await this.brandRepository.findById(brandId, {
                BrandAlert: true
            });

            if (!brand || brand.user_id != userId) {
                return errorResponse(errorTypes._404.brand_nf_user, 404);
            }

            return {
                status: 200,
                data: {
                    name: brand.name,
                    email: brand.email,
                    identifier: brand.identifier,
                    phone_number: brand.phone_number,
                    user_id: brand.user_id,
                    brand_alert: separarPorPropriedade(brand.BrandAlert, 'nature')
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.find_alerts_by_brand_name, 500, error);
        }
    }

    // @Cron(CronExpression.EVERY_10_SECONDS)
    async brandMonitoring(userId: string) {
        try {
            const brands = await this.brandRepository.find({
                MonitoringPlan: {
                    every: {
                        status: EStatus.active
                    }
                },
                BrandMonitoring: {
                    some: {
                        status: EBrandMonitoring.pending
                    }
                },
                ...(userId ? { user_id: userId } : {})
            }, {
                include: {
                    MonitoringPlan: true,
                    BrandMonitoring: true
                }
            });

            const brandAlerts = await Promise.all(brands.map(async brand => {
                const alerts = await this.findAlertsByBrandName(brand.id, brand.user_id,
                    brand.BrandMonitoring[0].last_magazine_searched ? brand.BrandMonitoring[0].last_magazine_searched : null
                );


                const count = await this.journalAlertRepository.count({
                    brand: {
                        equals: brand.name,
                        mode: 'insensitive'
                    },
                    ...(brand.BrandMonitoring[0].last_magazine_searched ? { journal_number: { gt: brand.BrandMonitoring[0].last_magazine_searched } } : {})
                });

                if (alerts.status != 200) {
                    throw new Error(JSON.stringify(alerts.data));
                }

                return {
                    brand_id: brand.id,
                    user_id: brand.user_id,
                    brand_monitoring_id: brand.BrandMonitoring[0].id,
                    last_nalysis: brand.BrandMonitoring[0].last_magazine_searched,
                    total_processed: brand.BrandMonitoring[0].total_processed + count,
                    data: alerts.data
                };
            }));

            await Promise.all(brandAlerts.map(async (brand: any) => {
                const result = await this.prisma.$transaction(async (tx: PrismaClient) => {
                    if (brand.data.alerts.length > 0) {
                        const lastMov = brand.data.alerts[brand.data.alerts.length - 1] as JournalAlert;

                        await this.brandAlertRepository.createMany(
                            brand.data.alerts.map(b => {
                                delete b.id;

                                return {
                                    ...b,
                                    user_id: brand.user_id,
                                    brand_id: brand.brand_id,
                                    brand_monitoring_id: brand.brand_monitoring_id
                                }
                            }),
                            tx
                        ).catch(err => console.log(err));

                        await this.brandMonitoringRepository.update({
                            status: EBrandMonitoring.realized,
                            id: brand.brand_monitoring_id,
                            last_magazine_searched: lastMov.journal_number,
                            deposit: lastMov.deposit_date,
                            last_movement: lastMov.deposit_date,
                            total_processed: brand.total_processed,
                            last_search: new Date(),
                        }, tx)
                    }
                })
            }));

        } catch (error) {
            return errorResponse(errorTypes._500.brand_monitoring, 500, error);
        }
    }

    async publicBrandFind({
        brand_name,
        name,
        email,
        radical,
        international
    }: { brand_name: string, name: string, email: string, radical: boolean, international: boolean }, page: number, limit: number) {
        try {
            this.publicBrandSearchRepository.create({
                brand: brand_name,
                name,
                email,
                radical
            });

            if (international) {
                const credential = await this.euipoAPIToken.get();
                const clientId = process.env.CLIENT_ID_EUIPO;

                const results = await axios({
                    method: 'get',
                    url: `${process.env.TRADEMARK_SEARCH_URL_EUIPO}`,
                    params: {
                        query: `wordMarkSpecification.verbalElement==${brand_name}`,
                        sort: 'applicationDate:desc',
                        size: 50
                    },
                    headers: {
                        'Authorization': `Bearer ${credential.access_token}`,
                        'X-IBM-Client-Id': clientId,
                    },
                });

                return {
                    status: 200,
                    data: {
                        raws: results.data.trademarks.map(data => ({
                            id: parseInt(data.applicationNumber),
                            brand: data.wordMarkSpecification.verbalElement,
                            deposit_date: new Date(data.applicationDate),
                            conception_date: null,
                            effective_date: null,
                            nature: data.markKind,
                            presentation: data.markFeature,
                            classe_nice: [
                                {
                                    'classe-nice': [
                                        ...(
                                            data.niceClasses.map(c => ({
                                                '$': {
                                                    'codigo': c
                                                }
                                            }))
                                        )
                                    ]
                                }
                            ],
                            prioridade_unionista: null,
                            apostila: null,
                            classe_viena: null,
                            journal_number: data.applicationNumber,
                            journal_date: new Date(data.applicationDate),
                            process_number: data.applicationNumber,
                            attorney: data.representatives?.[0]?.name,
                            titular: [{
                                'titular': [{
                                    '$': {
                                        'nome-razao-social': data.representatives?.[0]?.name,
                                    }
                                }]
                            }],
                            despacho: {
                                codigo: null,
                                status: data.status
                            },
                            sobrestador: null,
                            jornal_to_fetch_id: parseInt(data.applicationNumber),
                            created_at: new Date(),
                            updated_at: new Date()
                        }))
                    }
                }
            }

            const alerts = await this.journalAlertRepository.findByBrandName(brand_name, null, radical, {
                pag: {
                    // page,
                    limit: 100,
                },
                // order: {
                //     journal_number: 'desc'
                // },
                unique: true
            });

            return {
                status: 200,
                data: {
                    page,
                    // limit,
                    // pages,
                    raws: alerts
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.public_find_brand, 500, error);
        }
    }
}
