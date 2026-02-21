import 'dotenv/config';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface LeadSeed {
  name: string;
  email: string;
  phone_number?: string;
  description?: string;
  data?: Record<string, any>;
  collectionSlug: string;
  tenantSlug: string;
}

export async function seedLeads() {
  const leads: LeadSeed[] = [
    {
      name: 'João Silva',
      email: 'joao.silva@example.com',
      phone_number: '5511987654321',
      description: 'Interested in consulting services',
      data: { company: 'Tech Solutions Ltda', source: 'website' },
      collectionSlug: 'website-zarp-studio',
      tenantSlug: 'zarp-studio',
    },
    {
      name: 'Maria Santos',
      email: 'maria.santos@example.com',
      phone_number: '5521976543210',
      description: 'Strategic partnership inquiry',
      data: { company: 'Inovação Digital', source: 'website' },
      collectionSlug: 'website-zarp-studio',
      tenantSlug: 'zarp-studio',
    },
    {
      name: 'Pedro Oliveira',
      email: 'pedro.oliveira@example.com',
      phone_number: '5511965432109',
      description: 'Black Friday promotion signup',
      data: { company: 'StartupXYZ', source: 'landing_page' },
      collectionSlug: 'lp-black-friday-2024',
      tenantSlug: 'zarp-studio',
    },
    {
      name: 'Ana Costa',
      email: 'ana.costa@example.com',
      phone_number: '5511954321098',
      description: 'System development quote request',
      data: { source: 'contact_form' },
      collectionSlug: 'contato-empresa-teste',
      tenantSlug: 'empresa-teste',
    },
    {
      name: 'Carlos Mendes',
      email: 'carlos.mendes@example.com',
      phone_number: '21943210987',
      description: 'Innovation webinar registration',
      data: { company: 'Consultoria Tech', source: 'webinar' },
      collectionSlug: 'webinar-tech-innovations',
      tenantSlug: 'tech-innovations',
    },
    {
      name: 'Beatriz Lima',
      email: 'beatriz.lima@example.com',
      phone_number: '5511932109876',
      description: 'General inquiry',
      data: { company: 'Marketing Digital Pro', source: 'website' },
      collectionSlug: 'website-zarp-studio',
      tenantSlug: 'zarp-studio',
    },
    {
      name: 'Roberto Alves',
      email: 'roberto.alves@example.com',
      phone_number: '5521921098765',
      description: 'API integration support needed',
      data: { company: 'E-commerce Brasil', source: 'contact_form' },
      collectionSlug: 'contato-empresa-teste',
      tenantSlug: 'empresa-teste',
    },
  ];

  let inseridos = 0;
  let atualizados = 0;

  console.log('\n[LEADS SEED]');

  for (const lead of leads) {
    const collection = await prisma.leadCollection.findUnique({
      where: { slug: lead.collectionSlug },
    });

    if (!collection) {
      console.log(`  ⚠ SKIP: Collection "${lead.collectionSlug}" não encontrada para lead "${lead.name}"`);
      continue;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: lead.tenantSlug },
    });

    if (!tenant) {
      console.log(`  ⚠ SKIP: Tenant "${lead.tenantSlug}" não encontrado para lead "${lead.name}"`);
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
      description: lead.description,
      data: lead.data,
      collection_id: collection.id,
      tenant_id: tenant.id,
    };

    if (existing) {
      await prisma.lead.update({
        where: { id: existing.id },
        data,
      });
      atualizados++;
      console.log(`  ↻ Lead atualizado: ${lead.name} (${lead.email})`);
    } else {
      await prisma.lead.create({ data });
      inseridos++;
      console.log(`  ✓ Lead criado: ${lead.name} (${lead.email})`);
    }
  }

  console.log(`\n  Resumo: ${inseridos} criados, ${atualizados} atualizados\n`);

  await prisma.$disconnect();
}
