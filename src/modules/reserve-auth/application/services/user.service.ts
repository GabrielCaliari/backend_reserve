import { Inject, Injectable } from '@nestjs/common';
import { errorTypes } from '../../../../shared/constants/error-types';
import { errorResponse, gerarSenha } from '../../../../shared/helpers';
import { IAuthenticateUser, IValidateUserToken } from '../../domain/interfaces/authenticate-user.interface';
import {
    IUserRepository,
    IUserCredentialRepository,
    IUserSessionTokenRepository,
    IPlanRepository,
    IUserCollectionMembershipRepository,
    ICreateUser,
    USER_REPOSITORY,
    USER_CREDENTIAL_REPOSITORY,
    USER_SESSION_TOKEN_REPOSITORY,
    PLAN_REPOSITORY,
    USER_COLLECTION_MEMBERSHIP_REPOSITORY,
} from '../../domain/interfaces';
const Stripe = require('stripe');

@Injectable()
export class UserService {
    constructor(
        @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
        @Inject(USER_CREDENTIAL_REPOSITORY) private readonly userCredentialRepository: IUserCredentialRepository,
        @Inject(USER_SESSION_TOKEN_REPOSITORY) private readonly userSessionTokenRepository: IUserSessionTokenRepository,
        @Inject(PLAN_REPOSITORY) private readonly planRepository: IPlanRepository,
        @Inject(USER_COLLECTION_MEMBERSHIP_REPOSITORY) private readonly userCollectionMembershipRepository: IUserCollectionMembershipRepository,
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

    async generatePaymentAccountLink(vetId: string) {
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
            return errorResponse(errorTypes._500.generate_subscription_management_link_error, 500);
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

            // Lockout por conta, persistido — complementa o rate limit por IP.
            const lockout = await this.userCredentialRepository.findLockoutState(user.id);
            if (lockout?.lockedUntil && lockout.lockedUntil > new Date()) {
                return {
                    status: 423,
                    data: {
                        code: errorTypes._423.user_account_locked,
                        message: 'Conta temporariamente bloqueada por tentativas de senha incorretas. Tente novamente mais tarde.',
                        locked_until: lockout.lockedUntil.toISOString(),
                    }
                }
            }

            const compareHashByUserId = await this.userCredentialRepository.compareHashByUserId(data.password, user.id);

            if (!compareHashByUserId) {
                await this.userCredentialRepository.registerFailedAttempt(user.id);
                return errorResponse(errorTypes._401.user_password_in, 401);
            }

            await this.userCredentialRepository.clearFailedAttempts(user.id);

            const session = await this.userSessionTokenRepository.create({
                user_id: user.id,
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
                        user_id: tokenIsValidResponse.user_id
                    }
                }
            }

            return errorResponse(errorTypes._401.user_token_in, 401);
        } catch (error) {
            return errorResponse(errorTypes._500.unable_vausertoken, 500, error);
        }
    }

    async me(userId: string) {
        try {
            const user = await this.userRepository.selectById(userId, {
                Plan: true,
                Subscription: true
            });

            if (!user) {
                return errorResponse(errorTypes._404.user_nf, 404);
            }

            const subscription = user.Subscription.find(subs => subs.status == 'active' || subs.status == 'trialing');

            return {
                status: 200,
                data: {
                    name: user.name,
                    email: user.email,
                    phone_number: user.phone_number,
                    cpf: user.cpf,
                    plan_slug: user.Plan.slug,
                    plan_expires_in: user.date_expires_in,
                    plan: {
                        slug: user.Plan.slug,
                        interval: subscription ? subscription.interval : null
                    },
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.listing_user_data, 500, error);
        }
    }

    async listCollections(userId: string, tenantId?: string) {
        try {
            const memberships = await this.userCollectionMembershipRepository.findCollectionsByUserId(userId, tenantId);

            return {
                status: 200,
                data: memberships.map((membership: any) => ({
                    membership_id: membership.id,
                    role: membership.role,
                    active: membership.active,
                    collection: {
                        id: membership.Collection.id,
                        name: membership.Collection.name,
                        slug: membership.Collection.slug,
                        description: membership.Collection.description,
                        tenant_id: membership.Collection.tenant_id,
                        active: membership.Collection.active,
                    },
                })),
            };
        } catch (error) {
            return errorResponse('500:USER_COLLECTIONS_NOT_LISTED', 500, error);
        }
    }

    async getCollectionContext(userId: string, collectionId: string, tenantId?: string) {
        try {
            const membership = await this.userCollectionMembershipRepository.findMembership(userId, collectionId, tenantId);

            if (!membership) {
                return errorResponse('404:USER_COLLECTION_NOT_FOUND', 404);
            }

            return {
                status: 200,
                data: {
                    membership_id: membership.id,
                    role: membership.role,
                    active: membership.active,
                    tenant_id: membership.Collection.tenant_id,
                    collection: {
                        id: membership.Collection.id,
                        name: membership.Collection.name,
                        slug: membership.Collection.slug,
                        description: membership.Collection.description,
                        active: membership.Collection.active,
                    },
                },
            };
        } catch (error) {
            return errorResponse('500:USER_COLLECTION_CONTEXT_NOT_FOUND', 500, error);
        }
    }

    async checkout(slug: string, userId: string, period: string) {
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
                line_items: [{ price: plan[`${period}_price_id`], quantity: 1 }],
                mode: 'subscription',
                success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: process.env.STRIPE_CANCEL_URL,
                metadata: { userId },
            });

            return {
                status: 200,
                data: { url: session.url }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.checkout_error, 500, error);
        }
    }
}
