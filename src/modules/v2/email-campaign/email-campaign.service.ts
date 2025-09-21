import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { errorResponse, loadFile, successResponse } from 'src/core/functions'
import CampaignBatchRepository from 'src/core/database/repository/campaign-batch.repository';
import { DeliveryRepository } from 'src/core/database/repository/delivery.repository';
import EmailCampaignRepository from 'src/core/database/repository/email-campaign.repository';
import EmailLeadRepository from 'src/core/database/repository/email-lead.repository';
import EmailRepository from 'src/core/database/repository/email.repository';
import SMTPServerRepository from 'src/core/database/repository/smtp-server.repository';
import { InjectQueue } from '@nestjs/bull';
import { ERROR_CAMPAIGN_BATCH_NOT_FOUND, ERROR_CLOSE_SETUP, ERROR_CREATE_PRIMARY_COPY_VARIANT, ERROR_EMAIL_CAMPAIGN_CREATE, ERROR_EMAIL_CAMPAIGN_NOT_FOUND, ERROR_EMAIL_CAMPAIGN_NOT_SETUP, ERROR_EMAIL_LEAD_NOT_FOUND, ERROR_FIND_CAMPAIGN_BATCH_BY_ID, ERROR_FIND_EMAIL_CAMPAIGN, ERROR_FIND_EMAIL_CAMPAIGN_BY_ID, ERROR_FIND_EMAIL_LEADS_BY_EMAIL_CAMPAIGN_ID, ERROR_FIND_PRIMARY_COPY_VARIANT_BY_EMAIL_CAMPAIGN_ID, ERROR_PRIMARY_COPY_NOT_FOUND, ERROR_SMTP_SERVER_NOT_FOUND, ERROR_UPDATE_COPY_VARIANT, ERROR_UPDATE_EMAIL_CAMPAIGN_BATCH_SIZE, ERROR_UPLOAD_EMAIL_LEAD_CSV } from 'src/core/constants';
import { ECopyVariationType, EEmailCampaignStatus } from 'src/@types/@Email-campaign';
import prismaClient from 'src/core/database/prisma/prismaClient';
import * as fs from 'fs';
import * as csvParser from 'csv-parser';
import { ELeadStatus } from 'src/@types/@lead';
import { PrismaClient } from '@prisma/client';
import { generateObject } from 'ai';
import { EEmailType } from 'src/@types/@email';
import { azure } from 'src/core/providers/ai/ai-zure.lib';
import { z } from 'zod/v4';
import { ECampaignBatchStatus } from 'src/@types/@campaign-batch';
import { EDeliveryStatus } from 'src/@types/@delivery';

@Injectable()
export class EmailCampaignService {
    private copyVariantAgent: string;

    constructor(
        private readonly emailCampaignRepository: EmailCampaignRepository,
        private readonly smtpServerRepository: SMTPServerRepository,
        private readonly emailLeadRepository: EmailLeadRepository,
        private readonly emailRepository: EmailRepository,
        private readonly deliveryRepository: DeliveryRepository,
        private readonly campaignBatchRepository: CampaignBatchRepository,
        @InjectQueue('email-campaign-queue') private readonly queue: Queue
    ) {
        this.loadPrompts();
    }

    private async loadPrompts() {
        this.copyVariantAgent = await loadFile('src', 'core', 'prompts', 'copy-variation-agent.txt');
    }

    public async createEmailCampaign(
        name: string,
    ) {
        try {
            const smtpServer = await this.smtpServerRepository.selectDefault();

            if (!smtpServer) {
                return errorResponse(ERROR_SMTP_SERVER_NOT_FOUND, 400);
            }

            const emailCampaign = await this.emailCampaignRepository.create({
                name: name,
                smtp_server_id: smtpServer.id
            });

            return successResponse({
                id: emailCampaign.id,
            });
        } catch (err) {
            return errorResponse(ERROR_EMAIL_CAMPAIGN_CREATE, 500, err);
        }
    }

    public async findEmailCampaign({ page = 1, limit = 30 }) {
        try {
            const { raws, count } = await this.emailCampaignRepository.find({
                page,
                limit,
            });

            return successResponse({
                email_campaigns: raws,
                page: {
                    count,
                    count_pages: Math.ceil(count / limit),
                    current_page: page,
                    limit
                }
            });
        } catch (err) {
            return errorResponse(ERROR_FIND_EMAIL_CAMPAIGN, 500, err);
        }
    }

    public async getEmailCampaignById(id: string) {
        try {
            const emailCampaign = await this.emailCampaignRepository.selectById(Number(id));

            if (!emailCampaign) {
                return errorResponse(ERROR_EMAIL_CAMPAIGN_NOT_FOUND, 404);
            }

            return successResponse({
                ...emailCampaign
            });
        } catch (err) {
            return errorResponse(ERROR_FIND_EMAIL_CAMPAIGN_BY_ID, 500, err);
        }
    }

    public async getBatchesByEmailCampaignId(id: string) {
        try {
            const emailCampaign = await this.emailCampaignRepository.selectById(Number(id));

            if (!emailCampaign) {
                return errorResponse(ERROR_EMAIL_CAMPAIGN_NOT_FOUND, 404);
            }

            const batches = await this.campaignBatchRepository.selectAllByEmailCampaignId(Number(id));

            if (!batches) {
                return errorResponse(ERROR_CAMPAIGN_BATCH_NOT_FOUND, 404);
            }

            return successResponse({
                campaign_batches: batches
            });
        } catch (err) {
            return errorResponse(ERROR_FIND_CAMPAIGN_BATCH_BY_ID, 500, err);
        }
    }

    public async updateCopyVariant(id: string, copy_variation_type: ECopyVariationType) {
        try {
            const emailCampaign = await this.emailCampaignRepository.selectById(Number(id));

            if (!emailCampaign || emailCampaign.status !== EEmailCampaignStatus.draft) {
                return errorResponse(ERROR_EMAIL_CAMPAIGN_NOT_FOUND, 404);
            }

            const raw = await this.emailCampaignRepository.updateCopyVariant(Number(id), copy_variation_type);

            return successResponse({
                id: raw.id
            });
        } catch (err) {
            return errorResponse(ERROR_UPDATE_COPY_VARIANT, 500, err);
        }
    }

    public async getLeadsByEmailCampaignId(id: string) {
        try {
            const emailCampaign = await this.emailCampaignRepository.selectById(Number(id));

            if (!emailCampaign) {
                return errorResponse(ERROR_EMAIL_CAMPAIGN_NOT_FOUND, 404);
            }

            const leads = await this.emailLeadRepository.selectAllByEmailCampaignId(Number(id));

            if (!leads) {
                return errorResponse(ERROR_EMAIL_LEAD_NOT_FOUND, 404);
            }

            return successResponse({
                email_leads: leads
            });
        } catch (err) {
            return errorResponse(ERROR_FIND_EMAIL_LEADS_BY_EMAIL_CAMPAIGN_ID, 500, err);
        }
    }

    public async updateCampaignBatchSize(id: string, campaign_batch_size: number) {
        try {
            const emailCampaign = await this.emailCampaignRepository.selectById(Number(id));

            if (!emailCampaign && emailCampaign.status !== EEmailCampaignStatus.draft) {
                return errorResponse(ERROR_EMAIL_CAMPAIGN_NOT_FOUND, 404);
            }

            const raw = await this.emailCampaignRepository.updateCampaignBatchSize(Number(id), campaign_batch_size);

            return successResponse({
                id: raw.id
            });
        } catch (err) {
            return errorResponse(ERROR_UPDATE_EMAIL_CAMPAIGN_BATCH_SIZE, 500, err);
        }
    }

    public async uploadLeadsCSV(uploadInfo: {
        original_name: string;
        file_name: string;
        file_path: string;
        size: number;
    }, emailCampaignId: number) {
        try {
            const { original_name, file_name, file_path, size } = uploadInfo;

            const emailCampaign = await this.emailCampaignRepository.selectById(emailCampaignId);

            if (!emailCampaign || emailCampaign.status !== EEmailCampaignStatus.draft) {
                return errorResponse(ERROR_EMAIL_CAMPAIGN_NOT_FOUND, 404);
            }

            const response = await prismaClient.$transaction(async (prisma) => {
                const raw = await new Promise((resolve, reject) => {
                    let leadsBatch: any[] = [];
                    let leadsCreated = 0;
                    fs.createReadStream(file_path)
                        .pipe(csvParser())
                        .on('data', async (row) => {
                            const lead = {
                                email: row.email,
                                email_campaign_id: emailCampaignId,
                                status: ELeadStatus.new
                            };
                            leadsBatch.push(lead);
                            leadsCreated++;
                            if (leadsBatch.length === 5000) {
                                const leads = await this.emailLeadRepository.selectAllByEmailCampaignIdAndEmails(emailCampaignId, leadsBatch.map(lead => lead.email));
                                const leadsToCreate = leadsBatch.filter(lead => !leads.some(l => l.email === lead.email));
                                await this.emailLeadRepository.createLead(leadsToCreate, prisma as PrismaClient);
                                leadsBatch = [];
                            }
                        })
                        .on('end', async () => {
                            if (leadsBatch.length > 0) {
                                const leads = await this.emailLeadRepository.selectAllByEmailCampaignIdAndEmails(emailCampaignId, leadsBatch.map(lead => lead.email));
                                const leadsToCreate = leadsBatch.filter(lead => !leads.some(l => l.email === lead.email));
                                await this.emailLeadRepository.createLead(leadsToCreate, prisma as PrismaClient);
                            }
                            resolve(leadsCreated);
                        })
                        .on('error', (err) => {
                            reject(err);
                        });
                });

                const totalLeads = await this.emailLeadRepository.countByEmailCampaignId(emailCampaignId, prisma as PrismaClient);

                await this.emailCampaignRepository.updateTotalLeads(emailCampaignId, +totalLeads);
            });

            return successResponse({
                original_name: original_name,
                file_name: file_name,
                file_path: file_path,
                size: size
            })
        } catch (err) {
            return errorResponse(ERROR_UPLOAD_EMAIL_LEAD_CSV, 500, err);
        }
    }

    public async findPrimaryCopyVariant(id: string) {
        try {
            const emailCampaign = await this.emailCampaignRepository.selectById(Number(id));

            if (!emailCampaign || emailCampaign.status !== EEmailCampaignStatus.draft) {
                return errorResponse(ERROR_EMAIL_CAMPAIGN_NOT_FOUND, 404);
            }

            const primaryCopyVariant = await this.emailRepository.selectByEmailCampaignIdAndType(emailCampaign.id, EEmailType.primary);

            if (!primaryCopyVariant) {
                return errorResponse(ERROR_PRIMARY_COPY_NOT_FOUND, 404);
            }

            return {
                status: 200,
                data: primaryCopyVariant
            };
        } catch (err) {
            return errorResponse(ERROR_FIND_PRIMARY_COPY_VARIANT_BY_EMAIL_CAMPAIGN_ID, 500, err);
        }
    }

    public async createPrimaryCopyVariant(id: string, copy: {
        subject: string;
        pre_header?: string;
        from_name: string;
        html: string;
        md: string;
        use_header: boolean;
        use_footer: boolean;
    }) {
        try {
            const emailCampaign = await this.emailCampaignRepository.selectById(Number(id));

            if (!emailCampaign || emailCampaign.status !== EEmailCampaignStatus.draft) {
                return errorResponse(ERROR_EMAIL_CAMPAIGN_NOT_FOUND, 404);
            }

            // TODO: Adicionar a lógica para usar o use_header e use_footer (puxar header e footer do config)
            const result = await prismaClient.$transaction(async (prisma) => {
                const primaryCopyVariant = await this.emailRepository.create({
                    name: emailCampaign.name,
                    subject: copy.subject,
                    ...(copy.pre_header && { pre_header: copy.pre_header }),
                    html_content: copy.html,
                    from_name: copy.from_name,
                    md_content: copy.md,
                    type: EEmailType.primary,
                    used_ai: false,
                    edited: false,
                    use_footer: copy.use_footer,
                    use_header: copy.use_header,
                }, prisma as PrismaClient);

                await this.emailCampaignRepository.updateMainEmail(Number(id), primaryCopyVariant.id, prisma as PrismaClient);

                return {
                    id: primaryCopyVariant.id
                };
            });

            return successResponse({
                id: result.id
            });
        } catch (err) {
            return errorResponse(ERROR_CREATE_PRIMARY_COPY_VARIANT, 500, err);
        }
    }

    public async closeSetup(id: string) {
        try {
            const emailCampaign = await this.emailCampaignRepository.selectById(Number(id));

            if (!emailCampaign || emailCampaign.status !== EEmailCampaignStatus.draft) {
                return errorResponse(ERROR_EMAIL_CAMPAIGN_NOT_FOUND, 404);
            }

            if (
                !emailCampaign.main_email_id ||
                !emailCampaign.campaign_batch_size ||
                !emailCampaign.total_leads ||
                !emailCampaign.copy_variation_type ||
                !emailCampaign.uploaded_leads
            ) {
                return errorResponse(ERROR_EMAIL_CAMPAIGN_NOT_SETUP, 400);
            }

            const primaryCopyVariant = await this.emailRepository.selectByEmailCampaignIdAndType(emailCampaign.id, EEmailType.primary);

            const totalLeads = await this.emailLeadRepository.countByEmailCampaignId(Number(id));

            if (totalLeads === 0) {
                return errorResponse(ERROR_EMAIL_LEAD_NOT_FOUND, 400);
            }

            const totalDelivery = Math.ceil(totalLeads / emailCampaign.campaign_batch_size);

            const emails = Array.from({ length: totalDelivery }, () => {
                return {
                    type: EEmailType.secondary,
                    name: primaryCopyVariant.name,
                    html_content: '',
                    md_content: '',
                    used_ai: true,
                    from_name: primaryCopyVariant.from_name,
                    pre_header: primaryCopyVariant.pre_header,
                    use_footer: primaryCopyVariant.use_footer,
                    use_header: primaryCopyVariant.use_header,
                    edited: false
                }
            });

            const emailsGenerated = await Promise.all(emails.map(async (email) => {
                const { object, usage } = await generateObject({
                    model: azure('gpt-4o-mini'),
                    temperature: 1,
                    messages: [
                        {
                            role: 'system',
                            content: this.copyVariantAgent
                        },
                        {
                            role: 'user',
                            content: `Copy principal: ${primaryCopyVariant.html_content}. Faça uma variação dessa copy. O assunto da copy: ${primaryCopyVariant.subject}. Varie o assunto da copy.`
                        }
                    ],
                    schemaName: 'copy_variant',
                    schemaDescription: 'copy variant',
                    schema: z.object({
                        copy_variant: z.string().describe("The copy variant of the email."),
                        subject: z.string().describe("The subject of the email."),
                    })
                });


                const trackingName = crypto.randomUUID();

                return {
                    html_content: object.copy_variant,
                    subject: object.subject,
                    prompt_tokens: usage.inputTokens,
                    completion_tokens: usage.outputTokens,
                    total_tokens: usage.totalTokens,
                    type: EEmailType.secondary,
                    name: email.name,
                    tracking_image: trackingName,
                    md_content: '',
                    used_ai: email.used_ai,
                    from_name: email.from_name,
                    pre_header: email.pre_header,
                    use_footer: email.use_footer,
                    use_header: email.use_header,
                    edited: email.edited
                }
            }));

            const result = await prismaClient.$transaction(async (prisma) => {
                const secondaryEmails = await this.emailRepository.createMany(emailsGenerated, prisma as PrismaClient);

                const campaignBatches = await this.campaignBatchRepository.createMany(secondaryEmails.map(email => ({
                    status: ECampaignBatchStatus.pending,
                    total_leads: totalLeads,
                    un_open_rate: 0,
                    un_click_rate: 0,
                    un_unsubscribe: 0,
                    email_id: email.id,
                    email_campaign_id: emailCampaign.id
                })), prisma as PrismaClient);

                let offset = 0;
                let processed = 0;
                let emailIndex = 0;
                const deliveriesToCreate = [];

                while (processed < totalLeads) {
                    const leads = await this.emailLeadRepository.selectByEmailCampaignIdWithPagination(Number(id), emailCampaign.campaign_batch_size, offset);
                    if (!leads || leads.length === 0) break;

                    const email = secondaryEmails[emailIndex];
                    const campaignBatch = campaignBatches[emailIndex];
                    if (!email || !campaignBatch) break;

                    for (const lead of leads) {
                        deliveriesToCreate.push({
                            email_id: email.id,
                            campaign_batch_id: campaignBatch.id,
                            lead_id: lead.id,
                            email_provider: lead.email.toLowerCase().split('@')[1],
                            email_sent_to: lead.email.toLowerCase(),
                            status: EDeliveryStatus.pending,
                            tracking_code: crypto.randomUUID(),
                        });
                    }

                    await this.campaignBatchRepository.update(campaignBatch.id, {
                        total_leads: leads.length,
                    }, prisma as PrismaClient);

                    processed += leads.length;
                    offset += emailCampaign.campaign_batch_size;
                    emailIndex++;
                }

                await this.deliveryRepository.createInBatch(deliveriesToCreate, prisma as PrismaClient);

                await this.emailCampaignRepository.update(Number(id), {
                    status: EEmailCampaignStatus.pending,
                }, prisma as PrismaClient);

                this.queue.add('setup', {
                    email_campaign_id: Number(id)
                });

                return {
                    deliveriesCreated: deliveriesToCreate.length,
                    emailsCreated: secondaryEmails.length
                }
            });

            return {
                status: 200,
                data: {
                    id: result,
                }
            };
        } catch (err) {
            return errorResponse(ERROR_CLOSE_SETUP, 500, err);
        }
    }
}
