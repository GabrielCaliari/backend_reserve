import { Injectable } from "@nestjs/common";
import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { ProviderException } from '@/shared/exceptions';
import EmailCampaignRepository from '@/modules/zarp-mailer/infrastructure/repositories/email-campaign-legacy.repository';
import { EEmailCampaignStatus } from '@/modules/zarp-mailer/domain/enums/email-campaign.enum';
import CampaignBatchRepository from '@/modules/zarp-mailer/infrastructure/repositories/campaign-batch.repository';
import { ECampaignBatchStatus } from '@/modules/zarp-mailer/domain/enums/campaign-batch-status.enum';

import { DeliveryRepository } from '@/modules/zarp-mailer/infrastructure/repositories/delivery.repository';
import { ESMTPProvider } from '@/modules/zarp-mailer/domain/enums/smtp-provider.enum';
import SMTPServerRepository from '@/modules/zarp-mailer/infrastructure/repositories/smtp-server-legacy.repository';
import { EncryptProvider } from '@/shared/providers/encrypt.provider';
import { env } from '@/shared/helpers';
import { EDeliveryStatus } from '@/modules/zarp-mailer/domain/enums/delivery-status.enum';
const { JSDOM } = require('jsdom');

const nodemailer = require('nodemailer');

@Processor('email-campaign-queue')
@Injectable()
export class EmailCampaignProcess {
    constructor(
        private readonly emailCampaignRepository: EmailCampaignRepository,
        private readonly campaignBatchRepository: CampaignBatchRepository,
        private readonly deliveryRepository: DeliveryRepository,
        private readonly smtpServerRepository: SMTPServerRepository,
        private readonly encryptProvider: EncryptProvider,
    ) { }

    @Process('setup')
    async handleSetup(job: Job<{ email_campaign_id: number }>) {
        try {

            console.log('opa')
            const { email_campaign_id } = job.data;
            const trackingDomain = env('TRACKING_DOMAIN');

            const emailCampaign = await this.emailCampaignRepository.selectById(email_campaign_id);

            if (!emailCampaign) {
                throw new Error('Email campaign not found. ID: ' + email_campaign_id);
            }

            if (emailCampaign.status !== EEmailCampaignStatus.pending) {
                throw new Error('Email campaign is not in pending status. ID: ' + email_campaign_id);
            }

            const smtpServer = await this.smtpServerRepository.selectById(emailCampaign.smtp_server_id);

            if (!smtpServer) {
                throw new Error('SMTP server not found. ID: ' + emailCampaign.smtp_server_id);
            }

            const campaignBatch = await this.campaignBatchRepository.selectFirstByEmailCampaignIdAndStatus(email_campaign_id, ECampaignBatchStatus.pending);

            if (!campaignBatch) {
                const updated = await this.emailCampaignRepository.update(email_campaign_id, {
                    status: EEmailCampaignStatus.sent
                });

                return { status: 200, data: {} }
            }

            await this.campaignBatchRepository.update(campaignBatch.id, {
                status: ECampaignBatchStatus.running
            });

            const deliveries = await this.deliveryRepository.selectAllByCampaignBatchId(campaignBatch.id);

            // TODO: Remover essa verificaÃ§Ã£o quando a lÃ³gica de disparo para Amazon SES Server for implementada
            if (smtpServer.provider === ESMTPProvider.amazon) {
                throw new Error('Amazon SES Server is not supported yet');
            }

            // TODO: Adicionar a lÃ³gica de disparo para Amazon SES Server e fazer essa funÃ§Ã£o ser externa
            switch (smtpServer.provider) {
                case ESMTPProvider.smtp:
                    let pk = env('SMTP_PRIVATE_KEY');

                    let password = this.encryptProvider.decrypt(smtpServer.hash_password, `${smtpServer.email}-${pk}`);

                    const transporter = nodemailer.createTransport({
                        host: smtpServer.host,
                        port: smtpServer.port,
                        secure: smtpServer.port === '465' ? true : false,
                        auth: {
                            user: smtpServer.username,
                            pass: password
                        }
                    });

                    const returnValues = await Promise.all(deliveries.map(async (delivery) => {
                        const dom = new JSDOM(delivery.email.html_content);
                        const links = dom.window.document.querySelectorAll('a');

                        links.forEach((link) => {
                            link.setAttribute('href', `https://${delivery.tracking_code}.${trackingDomain}/tr/c/${delivery.tracking_code}/${link.getAttribute('href')}`);
                        });

                        const htmlContent = dom.window.document.body.innerHTML;

                        const mailOptions = {
                            from: `${delivery.email.from_name} <${smtpServer.email}>`,
                            to: delivery.email_sent_to,
                            subject: delivery.email.subject,
                            html: `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <meta charset="UTF-8">
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                    <title>${delivery.email.subject}</title>
                                </head>
                                <body>
                                    ${htmlContent}
                                    <img class="display:none;width:1px;height:1px" src="https://${delivery.tracking_code}.${trackingDomain}/tr/o/${delivery.tracking_code}" alt="${delivery.tracking_code}">
                                </body>
                                </html>
                            `
                        };

                        const sendDate = new Date();

                        // {
                        //     accepted: [ 'rodrigo.bs.548@gmail.com' ],
                        //     rejected: [],
                        //     ehlo: [ '8BITMIME', 'STARTTLS', 'AUTH PLAIN LOGIN', 'Ok' ],
                        //     envelopeTime: 446,
                        //     messageTime: 254,
                        //     messageSize: 4386,
                        //     response: '250 Ok 010001973e15c73e-312b183a-1bef-4e4e-a868-1af89b5ae6c6-000000',
                        //     envelope: {
                        //       from: 'contato@e-02.zarp.com.br',
                        //       to: [ 'rodrigo.bs.548@gmail.com' ]
                        //     },
                        //     messageId: '<ef7ee53c-9c96-b9ec-a1b6-d7c59cae92a0@e-02.zarp.com.br>'
                        //   }
                        const info = await transporter.sendMail(mailOptions).catch((err) => {
                            return err;
                        });

                        if (info.accepted && info.accepted.length > 0) {
                            await this.deliveryRepository.update(delivery.id, {
                                server_response: info,
                                server_response_date: new Date(),
                                send_date: sendDate,
                                status: EDeliveryStatus.sent,
                            });
                        } else {
                            await this.deliveryRepository.update(delivery.id, {
                                server_response: info,
                                server_response_date: new Date(),
                                send_date: sendDate,
                                status: EDeliveryStatus.failed,
                            });
                        }

                        return info.accepted.length > 0 ? true : false;
                    }));

                    const deliveriesSent = returnValues.filter((delivery) => delivery);
                    const deliveriesFailed = returnValues.filter((delivery) => !delivery);

                    await this.campaignBatchRepository.update(campaignBatch.id, {
                        status: ECampaignBatchStatus.finished,
                        finished_at: new Date(),
                        un_success_rate: deliveriesSent.length,
                        un_failed_rate: deliveriesFailed.length,
                    });

                    break;
                default:
                    throw new Error('SMTP server provider not supported');
            }

        } catch (err) {
            throw new ProviderException('Error processing email campaign setup', err);
        }
    }
}
