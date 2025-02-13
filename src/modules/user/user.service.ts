import { Injectable } from '@nestjs/common';
import { errorTypes } from 'src/core/error-types';
import { errorResponse, gerarSenha } from 'src/core/functions';
import UserRepository, { ICreateUser } from './user.repository';
import { IAuthenticateUser, IValidateUserToken } from 'src/@types/@authenticate-user';
import UserCredentialRepository from './user-credential.repository';
import UserSessionTokenRepository from './user-session-token.repository';
import SearchRepository from '../company/search.repository';
import PlanRepository from './plan.repository';
import BrandRepository from '../brand/brand.repository';
import BrandAlertRepository from '../brand/brand-alert.repository';
import { EStatus } from 'src/@types/@plan';
import BrandAnalysisRepository from '../brand-analysis/brand-analysis.repository';
import { EBrandAnalysisTokenStatus } from 'src/@types/@brand-analysis-token';
import AdditionalTokenPackRepository from './additional-token-pack.repository';
const Stripe = require('stripe');

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userCredentialRepository: UserCredentialRepository,
        private readonly userSessionTokenRepository: UserSessionTokenRepository,
        private readonly searchRepository: SearchRepository,
        private readonly planRepository: PlanRepository,
        private readonly brandAlertRepository: BrandAlertRepository,
        private readonly brandRepository: BrandRepository,
        private readonly brandAnalysisRepository: BrandAnalysisRepository,
        private readonly additionalTokenPackRepository: AdditionalTokenPackRepository
    ) { }

    async create({ email, name, password, cpf, phone_number }: ICreateUser) {
        try {
            const existingUserByEmail = await this.userRepository.selectByEmail(email);

            if (existingUserByEmail) {
                return errorResponse(errorTypes._400.user_alr_exe, 400);
            }

            const existingUserByCPF = await this.userRepository.selectByCPF(cpf);

            if (existingUserByCPF) {
                return errorResponse(errorTypes._400.user_alr_exc, 400);
            }

            const raw = await this.userRepository.create({
                email,
                name,
                password,
                cpf,
                phone_number
                // date_of_birth,
                // sex,
            });

            return {
                status: 201,
                data: {
                    id: raw.id
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.user_nc, 500, error);
        }
    }

    async preCreate({ email, name, phone_number }) {
        try {
            const existingUserByEmail = await this.userRepository.selectByEmail(email);

            if (existingUserByEmail) {
                return errorResponse(errorTypes._400.user_alr_exe, 400);
            }

            const password = gerarSenha();

            const raw = await this.userRepository.create({
                email,
                name,
                password,
                cpf: '0000000000',
                phone_number
                // date_of_birth,
                // sex,
            });

            return {
                status: 201,
                data: {
                    id: raw.id,
                    password
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.user_nc, 500, error);
        }
    }

    async generatePaymentAccountLink(vetId: number) {
        try {
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

            const user = await this.userRepository.selectById(vetId, {
                Plan: true,
                Subscription: true,
            })

            if (!user) {
                return errorResponse(errorTypes._404.user_nf, 400);
            }

            const subscription = user.Subscription.find(subs => subs.status == 'active' || subs.status == 'trialing');

            const session = await stripe.billingPortal.sessions.create({
                customer: subscription.customer_id,
                return_url: process.env.USER_DASHBOARD,
            });

            return {
                status: 200,
                data: {
                    link: session.url
                }
            }
        } catch (error) {
            console.log(error)
            return errorResponse(errorTypes._500.generate_subscription_management_link_error, 500);
        }
    }

    async feed(userId: number) {
        try {
            const user = await this.userRepository.selectById(userId, {
                Plan: true
            });

            const searcheds = await this.searchRepository.count(userId);
            const countBrands = await this.planRepository.countMonitoringPlans(userId);
            const countBrandsAnalTotal = await this.brandAnalysisRepository.countBrandAnalysisTokens(userId);
            const countBrandsAnalUsed = await this.brandAnalysisRepository.countBrandAnalysisTokens(userId, true);
            const countBrandsAnalNotUsed = await this.brandAnalysisRepository.countBrandAnalysisTokens(userId, false);

            const brands = await this.brandRepository.find({
                user_id: user.id,
                MonitoringPlan: {
                    some: {
                        status: EStatus.active
                    }
                }
            }, {
                pag: {
                    limit: 5,
                    page: 1
                }
            });

            const brandDetails = await Promise.all(brands.map(async brand => {
                const lastMove = await this.brandAlertRepository.findByBrand(brand.id, 1);

                return {
                    id: brand.id,
                    name: brand.name,
                    email: brand.email,
                    phone_number: brand.phone_number,
                    inpi_number: brand.inpi_number,
                    latest_brand_moves: lastMove
                }
            }));



            return {
                status: 200,
                data: {
                    search_done: searcheds,
                    max_search: user.Plan.maximum_queries,
                    brand_analysis: {
                        tokens: countBrandsAnalTotal,
                        used: countBrandsAnalUsed,
                        not_used: countBrandsAnalNotUsed
                    },
                    brand: brandDetails,
                    brand_monitoring: {
                        used: countBrands.used,
                        not_used: countBrands.not_used
                    },
                    plan: {

                    }
                },
            }
        } catch (error) {
            return errorResponse(errorTypes._500.user_feed, 500, error);
        }
    }

    async authenticate(data: IAuthenticateUser) {
        try {
            const user = await this.userRepository.selectByEmail(data.email);

            if (!user || !user.id) {
                return errorResponse(errorTypes._401.user_email_nf, 401);
            }

            if (user.email !== data.email) {
                return {
                    status: 401,
                    data: {
                        code: errorTypes._401.user_email_in
                    }
                }
            }

            const compareHashByUserId = await this.userCredentialRepository.compareHashByUserId(data.password, user.id);

            if (!compareHashByUserId) {
                return errorResponse(errorTypes._401.user_password_in, 401);
            }

            const session = await this.userSessionTokenRepository.create({
                userId: user.id,
                password: data.password,
                payload: {
                    id: user.id,
                    email: user.email,
                    name: user.name
                }
            });

            if (!session.token) {
                return errorResponse(errorTypes._401.user_password_in, 401);
            }

            return {
                status: 200,
                data: {
                    session_id: session.id,
                    session_token: session.token,
                    details: {
                        name: user.name,
                        email: user.email
                    }
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.user_una, 500, error);
        }
    }

    async validateToken(data: IValidateUserToken) {
        try {
            const tokenIsValidResponse = await this.userSessionTokenRepository.validateToken(data['session-id'], data.token)

            if (tokenIsValidResponse !== false) {
                return {
                    status: 200,
                    data: {
                        user_id: tokenIsValidResponse.userId
                    }
                }
            }

            return errorResponse(errorTypes._401.user_token_in, 401);
        } catch (error) {
            return errorResponse(errorTypes._500.unable_vausertoken, 500, error);
        }
    }

    async me(userId: number) {
        try {
            const user = await this.userRepository.selectById(userId, {
                Plan: true,
                Subscription: true
            });

            if (!user) {
                return errorResponse(errorTypes._404.user_nf, 404);
            }

            const countSearches = await this.searchRepository.countUserMonth(user.id);
            const countMonitoringPlans = await this.planRepository.countMonitoringPlans(user.id);

            const countBrandsAnalTotal = await this.brandAnalysisRepository.countBrandAnalysisTokens(userId);
            const countBrandsAnalUsed = await this.brandAnalysisRepository.countBrandAnalysisTokens(userId, true);
            const countBrandsAnalNotUsed = await this.brandAnalysisRepository.countBrandAnalysisTokens(userId, false);

            const subscription = user.Subscription.find(subs => subs.status == 'active' || subs.status == 'trialing');

            return {
                status: 200,
                data: {
                    name: user.name,
                    email: user.email,
                    phone_number: user.phone_number,
                    cpf: user.cpf,
                    max_search: user.Plan.maximum_queries,
                    used_search: countSearches,
                    plan_slug: user.Plan.slug,
                    plan_expires_in: user.date_expires_in,
                    maximum_queries_to_export: user.Plan.maximum_queries_to_export,
                    plan: {
                        slug: user.Plan.slug,
                        interval: subscription ? subscription.interval : null
                    },
                    brand_analysis: {
                        tokens: countBrandsAnalTotal,
                        used: countBrandsAnalUsed,
                        not_used: countBrandsAnalNotUsed
                    },
                    monitoring: {
                        used: countMonitoringPlans.used,
                        not_used: countMonitoringPlans.not_used
                    }
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.listing_user_data, 500, error);
        }
    }

    async checkout(
        slug: string,
        userId: number,
        period: string,
    ) {
        try {
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const plan = await this.planRepository.selectBySlug(slug);

            if (!plan) {
                return errorResponse(errorTypes._400.plan_not_found, 404)
            }

            if (!plan[`${period}_price_id`]) {
                return errorResponse(errorTypes._500.checkout_error, 500)
            }

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: plan[`${period}_price_id`],
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: process.env.STRIPE_CANCEL_URL,
                metadata: {
                    userId: userId
                },
            });

            return {
                status: 200,
                data: {
                    url: session.url
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.checkout_error, 500, error);
        }
    }

    async generateTokens(key: string, tokens: number, userId: number) {
        try {
            if (!(key === process.env.WEBHOOK_AT_KEY)) {
                return errorResponse(errorTypes._401.wh_token_in, 401);
            }

            const tokensRaws = Array.from({ length: tokens }, (_, i) => i + 1).map(token => {
                return {
                    user_id: userId,
                    status: EBrandAnalysisTokenStatus.active
                }
            });

            const raws = await this.brandAnalysisRepository.createBrandAnalysisTokens(tokensRaws);

            return {
                status: 200,
                data: raws.map(raw => raw.id)
            }
        } catch (error) {
            return errorResponse(errorTypes._500.generate_tokens_error, 500);
        }
    }

    async checkoutOrderBrandAnalysis(slug, userId) {
        try {
            const user = await this.userRepository.selectById(userId, {
                Plan: true,
            });

            if (!user) {
                return errorResponse(errorTypes._404.user_nf, 404);
            }

            if (user.Plan.slug === process.env.FREE_PLAN_SLUG) {
                return errorResponse(errorTypes._400.user_mh_plan, 400);
            }

            const raw = await this.additionalTokenPackRepository.selectPackBySlug(slug);

            if (!raw) {
                return errorResponse(errorTypes._404.additional_token_pack_nf, 400);
            }

            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: raw.external_id,
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: process.env.STRIPE_CANCEL_URL,
                metadata: {
                    userId: userId
                },
            });

            return {
                status: 200,
                data: {
                    url: session.url
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.checkout_order_brand_analysis, 500);
        }
    }
}
