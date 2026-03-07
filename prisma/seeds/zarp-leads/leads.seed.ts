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
    // ── Zarp Studio - Landing Page (potenciais clientes da agência) ───────────
    {
      name: 'Rodrigo Almeida',
      email: 'rodrigo@cafecaipira.com.br',
      phone_number: '+5511994320871',
      status: ELeadStatus.qualified,
      data: {
        company: 'Café Caipira',
        company_segment: 'food_and_beverage',
        company_size: '11-50',
        message:
          'Temos 4 unidades em São Paulo e precisamos de presença forte no Instagram e TikTok. Queremos criar conteúdo que gere filas nas lojas.',
        services_interest: ['gestao_redes_sociais', 'producao_conteudo', 'trafego_pago'],
        monthly_budget: 'R$ 5.000 - R$ 10.000',
        source: 'google',
        utm_campaign: null,
        utm_medium: 'organic',
      },
      collectionSlug: 'landing-page-contato-zarp',
      tenantSlug: 'zarp-studio',
      ip_address: '177.75.23.104',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15',
      country: 'Brazil',
      city: 'São Paulo',
      region: 'São Paulo',
    },
    {
      name: 'Camila Ferreira',
      email: 'camila@modaverde.com.br',
      phone_number: '+5521987654321',
      status: ELeadStatus.contacted,
      data: {
        company: 'Moda Verde',
        company_segment: 'fashion_ecommerce',
        company_size: '1-10',
        message:
          'Lançamos um e-commerce de moda sustentável há 6 meses e precisamos de identidade visual consistente, gestão das redes e campanhas pagas para escalar as vendas.',
        services_interest: ['identidade_visual', 'gestao_redes_sociais', 'trafego_pago', 'email_marketing'],
        monthly_budget: 'R$ 3.000 - R$ 5.000',
        source: 'instagram',
        utm_campaign: 'bio-link',
        utm_medium: 'social',
        website: 'modaverde.com.br',
      },
      collectionSlug: 'landing-page-contato-zarp',
      tenantSlug: 'zarp-studio',
      ip_address: '189.40.12.88',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
      country: 'Brazil',
      city: 'Rio de Janeiro',
      region: 'Rio de Janeiro',
    },
    {
      name: 'Lucas Barros',
      email: 'lucas.barros@grupoapex.com.br',
      phone_number: '+5541999887766',
      status: ELeadStatus.new,
      data: {
        company: 'Grupo Apex Imóveis',
        company_segment: 'real_estate',
        company_size: '51-200',
        message:
          'Somos uma imobiliária regional e não aparecer no Google está nos custando muito. Precisamos de SEO e um blog com conteúdo relevante para compradores de imóveis.',
        services_interest: ['seo', 'marketing_conteudo', 'criacao_blog'],
        monthly_budget: 'R$ 8.000 - R$ 15.000',
        source: 'indicacao',
        referred_by: 'Cliente Pedro Henrique',
        utm_campaign: null,
        utm_medium: null,
      },
      collectionSlug: 'landing-page-contato-zarp',
      tenantSlug: 'zarp-studio',
      ip_address: '200.132.55.19',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0',
      country: 'Brazil',
      city: 'Curitiba',
      region: 'Paraná',
    },
    {
      name: 'Juliana Mendonça',
      email: 'ju@clinicasthetica.com.br',
      phone_number: '+5562998001234',
      status: ELeadStatus.converted,
      data: {
        company: 'Clínica Stética',
        company_segment: 'aesthetics_clinic',
        company_size: '1-10',
        message:
          'Quero um pacote completo: branding, site, Instagram e Google Ads. Já tentei fazer sozinha mas não estou conseguindo resultados.',
        services_interest: ['branding', 'criacao_site', 'gestao_redes_sociais', 'trafego_pago'],
        monthly_budget: 'R$ 2.000 - R$ 4.000',
        source: 'google_ads',
        utm_campaign: 'clinicas-estetica-q1-2025',
        utm_medium: 'cpc',
        utm_source: 'google',
      },
      collectionSlug: 'landing-page-contato-zarp',
      tenantSlug: 'zarp-studio',
      ip_address: '187.115.60.201',
      user_agent: 'Mozilla/5.0 (Android 14; Mobile; rv:122.0) Gecko/122.0 Firefox/122.0',
      country: 'Brazil',
      city: 'Goiânia',
      region: 'Goiás',
    },
    {
      name: 'Paulo Saraiva',
      email: 'paulo@saraivaeassociados.adv.br',
      phone_number: '+5511933221100',
      status: ELeadStatus.lost,
      data: {
        company: 'Saraiva & Associados Advocacia',
        company_segment: 'legal_services',
        company_size: '11-50',
        message:
          'Precisamos de um site profissional e estratégia de conteúdo para LinkedIn para atrair clientes empresariais.',
        services_interest: ['criacao_site', 'marketing_conteudo', 'linkedin_strategy'],
        monthly_budget: 'Até R$ 2.000',
        source: 'linkedin',
        utm_campaign: null,
        utm_medium: 'social',
        loss_reason: 'budget_insuficiente',
      },
      collectionSlug: 'landing-page-contato-zarp',
      tenantSlug: 'zarp-studio',
      ip_address: '186.220.101.45',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edge/120.0.0.0',
      country: 'Brazil',
      city: 'São Paulo',
      region: 'São Paulo',
    },
    // ── Zarp Studio - Blog Newsletter ─────────────────────────────────────────
    {
      name: 'Fernanda Oliveira',
      email: 'fernanda.oliveira@gmail.com',
      phone_number: null,
      status: ELeadStatus.new,
      data: {
        source: 'blog_article',
        article_slug: 'seo-guia-definitivo-2025',
        subscription_topics: ['seo', 'marketing_conteudo'],
        double_optin_confirmed: true,
        optin_date: '2025-02-14',
      },
      collectionSlug: 'blog-newsletter-zarp',
      tenantSlug: 'zarp-studio',
      ip_address: '179.184.220.33',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/604.1',
      country: 'Brazil',
      city: 'Belo Horizonte',
      region: 'Minas Gerais',
    },
    {
      name: 'Rafael Cunha',
      email: 'rafaelcunha@hotmail.com',
      phone_number: null,
      status: ELeadStatus.new,
      data: {
        source: 'blog_article',
        article_slug: 'inbound-marketing-como-atrair-clientes',
        subscription_topics: ['inbound_marketing', 'gestao_redes_sociais', 'trafego_pago'],
        double_optin_confirmed: true,
        optin_date: '2025-03-01',
      },
      collectionSlug: 'blog-newsletter-zarp',
      tenantSlug: 'zarp-studio',
      ip_address: '201.17.44.112',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0',
      country: 'Brazil',
      city: 'Porto Alegre',
      region: 'Rio Grande do Sul',
    },
    {
      name: 'Beatriz Nunes',
      email: 'beatriz.nunes@outlook.com',
      phone_number: null,
      status: ELeadStatus.new,
      data: {
        source: 'blog_article',
        article_slug: 'identidade-visual-marca-memoravel',
        subscription_topics: ['branding', 'identidade_visual', 'marketing_conteudo'],
        double_optin_confirmed: false,
        optin_date: '2025-03-05',
        pending_confirmation: true,
      },
      collectionSlug: 'blog-newsletter-zarp',
      tenantSlug: 'zarp-studio',
      ip_address: '187.95.210.77',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
      country: 'Brazil',
      city: 'Florianópolis',
      region: 'Santa Catarina',
    },
    // ── Zarp Studio - Careers (candidaturas a vagas) ──────────────────────────
    {
      name: 'Isabella Gomes',
      email: 'isabella.gomes@gmail.com',
      phone_number: '+5511976543210',
      status: ELeadStatus.qualified,
      data: {
        position: 'Designer Gráfico Jr.',
        linkedin: 'https://linkedin.com/in/isabellagomes-design',
        portfolio: 'https://behance.net/isabellagomes',
        years_experience: 2,
        current_role: 'Freelancer',
        education: 'Bacharelado em Design Gráfico - FAAP (2023)',
        skills: ['Adobe Illustrator', 'Photoshop', 'Figma', 'Motion Design', 'Branding'],
        available_from: '2025-04-01',
        salary_expectation: 'R$ 3.500 - R$ 4.500',
        work_model: 'hibrido',
        city: 'São Paulo - SP',
        cover_letter:
          'Tenho paixão por criar identidades visuais que contam histórias. Acompanho o trabalho da Zarp Studio pelo Instagram há 1 ano e me identifico muito com o posicionamento de vocês.',
        cv_file_key: 'careers/cvs/isabella-gomes-cv-2025.pdf',
        how_found: 'linkedin',
      },
      collectionSlug: 'careers-candidaturas-zarp',
      tenantSlug: 'zarp-studio',
      ip_address: '177.92.34.111',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
      country: 'Brazil',
      city: 'São Paulo',
      region: 'São Paulo',
    },
    {
      name: 'Thiago Lima',
      email: 'thiago.lima.copy@gmail.com',
      phone_number: '+5521982334455',
      status: ELeadStatus.contacted,
      data: {
        position: 'Redator / Copywriter',
        linkedin: 'https://linkedin.com/in/thiago-lima-copy',
        portfolio: 'https://medium.com/@thiago.lima.copy',
        years_experience: 4,
        current_role: 'Analista de Conteúdo - Agência Orbit',
        education: 'Jornalismo - PUC-Rio (2021)',
        skills: ['Copywriting', 'SEO Writing', 'Email Marketing', 'Storytelling', 'WordPress'],
        available_from: '2025-05-01',
        salary_expectation: 'R$ 5.000 - R$ 7.000',
        work_model: 'remoto',
        city: 'Rio de Janeiro - RJ',
        cover_letter:
          'Já escrevi mais de 300 artigos otimizados para SEO e 40+ sequências de email marketing. Quero aplicar meu conhecimento numa agência que valoriza resultado de verdade.',
        cv_file_key: 'careers/cvs/thiago-lima-cv-2025.pdf',
        how_found: 'indicacao_colaborador',
        referred_by: 'Ana Beatriz (time de conteúdo)',
      },
      collectionSlug: 'careers-candidaturas-zarp',
      tenantSlug: 'zarp-studio',
      ip_address: '189.60.177.22',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0',
      country: 'Brazil',
      city: 'Rio de Janeiro',
      region: 'Rio de Janeiro',
    },
    {
      name: 'Fernanda Souza',
      email: 'fe.souza.social@gmail.com',
      phone_number: '+5548991223344',
      status: ELeadStatus.new,
      data: {
        position: 'Social Media Manager',
        linkedin: 'https://linkedin.com/in/fernandasouza-social',
        portfolio: 'https://www.instagram.com/fernandasouza.mktdigital',
        years_experience: 3,
        current_role: 'Social Media - Autônoma',
        education: 'Publicidade e Propaganda - UFSC (2022)',
        skills: ['Meta Ads', 'Planejamento de Conteúdo', 'Canva', 'Reels', 'Analytics'],
        available_from: '2025-04-15',
        salary_expectation: 'R$ 4.000 - R$ 5.500',
        work_model: 'remoto',
        city: 'Florianópolis - SC',
        cover_letter:
          'Gerencio 7 contas simultaneamente como freelancer, com resultados médios de +150% de alcance orgânico em 3 meses. Quero crescer como parte de um time estruturado.',
        cv_file_key: 'careers/cvs/fernanda-souza-cv-2025.pdf',
        how_found: 'instagram_zarp_studio',
      },
      collectionSlug: 'careers-candidaturas-zarp',
      tenantSlug: 'zarp-studio',
      ip_address: '187.75.88.199',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
      country: 'Brazil',
      city: 'Florianópolis',
      region: 'Santa Catarina',
    },
    {
      name: 'Marcelo Santos',
      email: 'marcelo.seo.santos@gmail.com',
      phone_number: '+5511944556677',
      status: ELeadStatus.new,
      data: {
        position: 'Especialista em SEO',
        linkedin: 'https://linkedin.com/in/marcelo-santos-seo',
        portfolio: 'https://marceloseo.com.br/cases',
        years_experience: 5,
        current_role: 'SEO Lead - E-commerce Marca X',
        education: 'Sistemas de Informação - Mackenzie (2020)',
        skills: ['Google Search Console', 'Semrush', 'Ahrefs', 'SEO Técnico', 'Link Building', 'Core Web Vitals'],
        certifications: ['Google Analytics 4', 'HubSpot SEO', 'Semrush SEO Toolkit'],
        available_from: '2025-06-01',
        salary_expectation: 'R$ 8.000 - R$ 11.000',
        work_model: 'remoto',
        city: 'São Paulo - SP',
        cover_letter:
          'Aumentei o tráfego orgânico de um e-commerce de R$ 0 para R$ 180k/mês em receita via SEO em 18 meses. Tenho interesse em levar esse tipo de resultado para clientes de agência.',
        cv_file_key: 'careers/cvs/marcelo-santos-cv-2025.pdf',
        how_found: 'google',
        search_term: 'vagas seo agencia marketing digital sp',
      },
      collectionSlug: 'careers-candidaturas-zarp',
      tenantSlug: 'zarp-studio',
      ip_address: '200.180.55.66',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/537.36 Chrome/121.0.0.0',
      country: 'Brazil',
      city: 'São Paulo',
      region: 'São Paulo',
    },

    // ── Empresa Teste - private collection
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
    const tenant = await prisma.tenant.findUnique({
      where: { slug: lead.tenantSlug },
    });

    if (!tenant) {
      console.log(
        `[SKIP] Tenant "${lead.tenantSlug}" not found for lead "${lead.name}"`,
      );
      continue;
    }

    const collection = await prisma.leadCollection.findFirst({
      where: { slug: lead.collectionSlug, tenant_id: tenant.id },
    });

    if (!collection) {
      console.log(
        `[SKIP] Collection "${lead.collectionSlug}" not found for lead "${lead.name}"`,
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
