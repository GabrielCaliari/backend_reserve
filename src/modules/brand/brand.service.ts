import { errorTypes } from 'src/core/error-types';
import { errorResponse, separarPorPropriedade } from 'src/core/functions';
import BrandRepository, { IBrandFields } from '../../core/database/repository/brand.repository';
import prismaClient from 'src/core/prisma/prismaClient';

import { Injectable } from '@nestjs/common';
import JournalAlertRepository from '../../core/database/repository/journal-alert.repository';
import BrandMonitoringRepository from '../../core/database/repository/brand-monitoring.repository';
import BrandNotificationRepository from '../../core/database/repository/brand-notification.repository';
import { EBrandMonitoring } from 'src/@types/@brand-monitoring';
import { JournalAlert, PrismaClient } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import PlanRepository from '../../core/database/repository/plan.repository';
import { EStatus } from 'src/@types/@plan';
import BrandAlertRepository from '../../core/database/repository/brand-alert.repository';
import PublicBrandSearchRepository from '../../core/database/repository/public-brand-search.repository';
import EuipoAPIToken from 'src/core/providers/implementations/Euipo.apitoken';
import axios from 'axios';
import LeadRepository from 'src/core/database/repository/lead.repository';
import { ICreateLead } from 'src/@types/@lead';

@Injectable()
export class BrandService {
    constructor(
        private readonly brandRepository: BrandRepository,
        private readonly journalAlertRepository: JournalAlertRepository,
        private readonly planRepository: PlanRepository,
        private readonly brandMonitoringRepository: BrandMonitoringRepository,
        private readonly brandAlertRepository: BrandAlertRepository,
        private readonly publicBrandSearchRepository: PublicBrandSearchRepository,
        private readonly euipoAPIToken: EuipoAPIToken,
        private readonly leadRepository: LeadRepository,
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

            const result = await prismaClient.$transaction(async (rx: PrismaClient) => {
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

    async createLead(data: ICreateLead) {
        try {
            const result = await this.leadRepository.create({
                ...data
            })

            return {
                status: 200,
                data: {
                    id: result.id,
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.registration_lead, 500, error);
        }
    }

    async findUserBrands(userId: number) {
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

    async findAlertsByBrandName(brandId: number, userId: number, lastMagazine: string | null = null) {
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

    async findBrand(brandId: number, userId: number) {
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
    async brandMonitoring(userId: number) {
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
                const result = await prismaClient.$transaction(async (tx: PrismaClient) => {
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

            if (international) {
                const credential = await this.euipoAPIToken.get();
                const clientId = process.env.CLIENT_ID_EUIPO;

                const results = await axios({
                    method: 'get',
                    url: process.env.TRADEMARK_SEARCH_URL_EUIPO,
                    headers: {
                        'Authorization': `Bearer ${credential.access_token}`,
                        'X-IBM-Client-Id': clientId,
                    },
                });

                console.log(results)

                return {
                    status: 200,
                    data: results.data
                }
            }

            const raw = await this.publicBrandSearchRepository.create({
                brand: brand_name,
                name,
                email,
                radical
            });

            const alerts = await this.journalAlertRepository.findByBrandName(brand_name, null, radical, {
                pag: {
                    // page,
                    limit: 1000,
                },
                order: {
                    journal_number: 'desc'
                },
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
