// @ts-nocheck
import 'dotenv/config';
import { PrismaClient, ELeadStatus } from "../../../src/generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function seedLeads() {
    const leads = [
        {
            name: 'John Anderson',
            email: 'john.anderson@techcorp.com',
            phone: '+1-555-0101',
            company: 'TechCorp Solutions',
            status: ELeadStatus.qualified,
            metadata: {
                source: 'website_form',
                interest: 'enterprise_plan',
                company_size: '50-200',
            },
            collectionSlug: 'colecao-publica-geral',
            tenantSlug: 'zarp-studio',
        },
        {
            name: 'Maria Silva',
            email: 'maria.silva@innovate.com',
            phone: '+1-555-0102',
            company: 'Innovate Labs',
            status: ELeadStatus.new,
            metadata: {
                source: 'landing_page',
                interest: 'api_integration',
                company_size: '10-50',
            },
            collectionSlug: 'colecao-publica-geral',
            tenantSlug: 'zarp-studio',
        },
        {
            name: 'Robert Chen',
            email: 'robert.chen@dataflow.io',
            phone: '+1-555-0103',
            company: 'DataFlow Inc',
            status: ELeadStatus.contacted,
            metadata: {
                source: 'referral',
                interest: 'brand_monitoring',
                company_size: '200+',
            },
            collectionSlug: 'colecao-publica-geral',
            tenantSlug: 'zarp-studio',
        },
        {
            name: 'Ana Costa',
            email: 'ana.costa@startup.com',
            phone: '+1-555-0104',
            company: 'Startup Ventures',
            status: ELeadStatus.new,
            metadata: {
                source: 'social_media',
                interest: 'company_data',
                company_size: '1-10',
            },
            collectionSlug: 'colecao-publica-geral',
            tenantSlug: 'zarp-studio',
        },
        {
            name: 'Test Lead',
            email: 'test@example.com',
            phone: '+1-555-9999',
            company: 'Test Company',
            status: ELeadStatus.new,
            metadata: {
                source: 'test',
                interest: 'testing',
            },
            collectionSlug: 'colecao-privada-teste',
            tenantSlug: 'empresa-teste',
        },
    ];

    let inserted = 0;
    let updated = 0;

    for (const lead of leads) {
        const collection = await prisma.leadCollection.findUnique({
            where: { slug: lead.collectionSlug },
        });

        if (!collection) {
            console.log(`[SKIP] Collection "${lead.collectionSlug}" not found for lead "${lead.name}"`);
            continue;
        }

        const tenant = await prisma.tenant.findUnique({
            where: { slug: lead.tenantSlug },
        });

        if (!tenant) {
            console.log(`[SKIP] Tenant "${lead.tenantSlug}" not found for lead "${lead.name}"`);
            continue;
        }

        const existing = await prisma.lead.findFirst({
            where: {
                email: lead.email,
                collection_id: collection.id,
            },
        });

        const data = {
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            status: lead.status,
            metadata: lead.metadata,
            collection_id: collection.id,
            tenant_id: tenant.id,
        };

        if (existing) {
            await prisma.lead.update({
                where: { id: existing.id },
                data,
            });
            updated++;
        } else {
            await prisma.lead.create({ data });
            inserted++;
        }
    }

    console.log(`\n----------------------------------------------------------------------------------\n`);
    console.log(`Leads inserted: ${inserted}, updated: ${updated}`);
    console.log(`\n----------------------------------------------------------------------------------\n`);
}
