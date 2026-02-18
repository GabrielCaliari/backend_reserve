import { PrismaClient } from "../../../../generated/prisma/client";
import { EEmailType } from '@/modules/zarp-mailer/domain/enums/email-type.enum';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';

export interface ICreateEmail {
    from_name: string;
    subject: string;
    pre_header?: string;
    html_content: string;
    type: EEmailType;
    md_content: string;
    name: string;
    used_ai: boolean;
    edited: boolean;
    use_footer: boolean;
    use_header: boolean;
}

@Injectable()
export default class EmailRepository {
    constructor(private readonly prisma: PrismaService) {}
    public async create(email: {
        from_name: string;
        subject: string;
        pre_header?: string;
        html_content: string;
        type: EEmailType;
        md_content: string;
        name: string;
        used_ai: boolean;
        edited: boolean;
        use_footer: boolean;
        use_header: boolean;
    }, prisma?: PrismaClient) {
        try {
            const conn = prisma ?? this.prisma;

            const raw = await conn.email.create({
                data: {
                    html_content: email.html_content,
                    md_content: email.md_content,
                    subject: email.subject,
                    ...(email.pre_header && { pre_header: email.pre_header }),
                    type: email.type,
                    name: email.name,
                    from_name: email.from_name,
                    used_ai: email.used_ai,
                    edited: email.edited,
                    use_footer: email.use_footer,
                    use_header: email.use_header,
                },
            });

            return raw;
        } catch (err) {
            throw new RepositoryException('Error creating email', err);
        }
    }

    public async selectById(id: number, prisma?: PrismaClient) {
        try {
            const conn = prisma ?? this.prisma;

            const raw = await conn.email.findUnique({
                where: {
                    id
                }
            });

            return raw;
        } catch (err) {
            throw new RepositoryException('Error selecting email by id', err);
        }
    }

    public async createMany(emails: ICreateEmail[], prisma?: PrismaClient) {
        try {
            const conn = prisma ?? this.prisma;

            const raw = await conn.email.createManyAndReturn({
                data: emails,
            });

            return raw;
        } catch (err) {
            throw new RepositoryException('Error creating many emails', err);
        }
    }

    public async selectByEmailCampaignIdAndType(emailCampaignId: number, type: EEmailType) {
        try {
            const email = await this.prisma.email.findFirst({
                include: {
                    EmailCampaign: true
                },
                where: {
                    EmailCampaign: {
                        some: {
                            id: emailCampaignId
                        }
                    },
                    type
                }
            })

            return email;
        } catch (err) {
            throw new RepositoryException('Error selecting email by email campaign id and type', err);
        }
    }
}