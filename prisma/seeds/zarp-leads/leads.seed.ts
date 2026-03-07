import 'dotenv/config';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Lead status enum (matches domain entity)
enum ELeadStatus {
  new = 1,
  contacted = 2,
  qualified = 3,
  converted = 4,
  lost = 5,
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function seedLeads() {
  const leads = [
    // Leads for zarp-studio tenant - public collection
    {
      name: 'John Anderson',
      email: 'john.anderson@techcorp.com',
      phone_number: '+15550101',
      status: ELeadStatus.qualified,
      data: {
        company: 'TechCorp Solutions',
        source: 'website_form',
        interest: 'enterprise_plan',
        company_size: '50-200',
      },
      collectionSlug: 'colecao-publica-geral',
      tenantSlug: 'zarp-studio',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      country: 'United States',
      city: 'San Francisco',
      region: 'California',
    },
    {
      name: 'Maria Silva',
      email: 'maria.silva@innovate.com',
      phone_number: '+15550102',
      status: ELeadStatus.new,
      data: {
        company: 'Innovate Labs',
        source: 'landing_page',
        interest: 'api_integration',
        company_size: '10-50',
      },
      collectionSlug: 'colecao-publica-geral',
      tenantSlug: 'zarp-studio',
      ip_address: '192.168.1.101',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      country: 'Brazil',
      city: 'São Paulo',
      region: 'São Paulo',
    },
    {
      name: 'Robert Chen',
      email: 'robert.chen@dataflow.io',
      phone_number: '+15550103',
      status: ELeadStatus.contacted,
      data: {
        company: 'DataFlow Inc',
        source: 'referral',
        interest: 'brand_monitoring',
        company_size: '200+',
      },
      collectionSlug: 'colecao-publica-geral',
      tenantSlug: 'zarp-studio',
      ip_address: '192.168.1.102',
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64)',
      country: 'Singapore',
      city: 'Singapore',
      region: 'Singapore',
    },
    {
      name: 'Ana Costa',
      email: 'ana.costa@startup.com',
      phone_number: '+15550104',
      status: ELeadStatus.new,
      data: {
        company: 'Startup Ventures',
        source: 'social_media',
        interest: 'company_data',
        company_size: '1-10',
      },
      collectionSlug: 'colecao-publica-geral',
      tenantSlug: 'zarp-studio',
      ip_address: '192.168.1.103',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
      country: 'Portugal',
      city: 'Lisbon',
      region: 'Lisbon',
    },

    // Leads for empresa-teste tenant - private collection
    {
      name: 'Test Lead',
      email: 'test@example.com',
      phone_number: '+15559999',
      status: ELeadStatus.new,
      data: {
        company: 'Test Company',
        source: 'test',
        interest: 'testing',
      },
      collectionSlug: 'colecao-privada-teste',
      tenantSlug: 'empresa-teste',
      ip_address: '127.0.0.1',
      user_agent: 'Test Agent',
      country: 'United States',
      city: 'Test City',
      region: 'Test Region',
    },

    // Leads for allbrickpavers.net tenant
    {
      name: 'Michael Johnson',
      email: 'michael.j@homeowner.com',
      phone_number: '+13055551234',
      status: ELeadStatus.new,
      data: {
        project_type: 'driveway',
        property_type: 'residential',
        square_footage: '500',
        timeline: '2-3 months',
        budget_range: '$5000-$10000',
        source: 'website_contact_form',
      },
      collectionSlug: 'frontend_pages_allbrickpavers',
      tenantSlug: 'allbrickpavers',
      ip_address: '192.168.2.10',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      country: 'United States',
      city: 'Miami',
      region: 'Florida',
    },
    {
      name: 'Sarah Williams',
      email: 'sarah.williams@gmail.com',
      phone_number: '+13055555678',
      status: ELeadStatus.qualified,
      data: {
        project_type: 'patio',
        property_type: 'residential',
        square_footage: '300',
        timeline: '1 month',
        budget_range: '$3000-$5000',
        source: 'google_ads',
        preferred_style: 'modern',
      },
      collectionSlug: 'frontend_pages_allbrickpavers',
      tenantSlug: 'allbrickpavers',
      ip_address: '192.168.2.11',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      country: 'United States',
      city: 'Fort Lauderdale',
      region: 'Florida',
    },
    {
      name: 'David Martinez',
      email: 'dmartinez@business.com',
      phone_number: '+13055559012',
      status: ELeadStatus.contacted,
      data: {
        project_type: 'commercial_parking',
        property_type: 'commercial',
        square_footage: '2000',
        timeline: '6 months',
        budget_range: '$50000+',
        source: 'referral',
        company: 'Martinez Properties LLC',
      },
      collectionSlug: 'frontend_pages_allbrickpavers',
      tenantSlug: 'allbrickpavers',
      ip_address: '192.168.2.12',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
      country: 'United States',
      city: 'West Palm Beach',
      region: 'Florida',
    },
  ];

  let inserted = 0;
  let updated = 0;

  for (const lead of leads) {
    const collection = await prisma.leadCollection.findUnique({
      where: { slug: lead.collectionSlug },
    });

    if (!collection) {
      console.log(
        `[SKIP] Collection "${lead.collectionSlug}" not found for lead "${lead.name}"`,
      );
      continue;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: lead.tenantSlug },
    });

    if (!tenant) {
      console.log(
        `[SKIP] Tenant "${lead.tenantSlug}" not found for lead "${lead.name}"`,
      );
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
      phone_number: lead.phone_number,
      status: lead.status,
      data: lead.data,
      collection_id: collection.id,
      tenant_id: tenant.id,
      ip_address: lead.ip_address,
      user_agent: lead.user_agent,
      country: lead.country,
      city: lead.city,
      region: lead.region,
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
