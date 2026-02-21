import 'dotenv/config';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Companies Seed - Sample data only
 * 
 * This seed contains only sample company data for testing.
 * For production, import real CNPJ data from Receita Federal.
 * 
 * Note: This seed is commented out by default in seeds.ts
 * as it requires CNAE data to be seeded first.
 */
export async function seedCompanies() {
  // Get first CNAE for reference
  const firstCnae = await prisma.cnae.findFirst();

  if (!firstCnae) {
    console.log('\n[COMPANIES SEED]');
    console.log('  ⚠ SKIP: Nenhum CNAE encontrado. Execute seed-cnaes.ts primeiro\n');
    return;
  }

  const companies = [
    {
      cnpj: '12345678000195',
      branch_type: 1,
      business_name: 'ZARP STUDIO TECNOLOGIA LTDA',
      status: '02',
      date_status: new Date('2024-01-15'),
      code_detail_status: '01',
      outer_city: null,
      coutry_code: null,
      start_date: new Date('2020-01-15'),
      type_of_place: 'Avenida',
      place: 'Paulista',
      house_number: '1000',
      address_complement: 'Sala 101',
      district: 'Bela Vista',
      cep: '01310100',
      uf: 'SP',
      city_code: '7107',
      ddd_1: '11',
      phone_1: '987654321',
      ddd_2: null,
      phone_2: null,
      ddd_fax: null,
      fax: null,
      email: 'contato@zarpstudio.com',
      special_citation: null,
      special_citation_date: null,
      load_update_date: new Date(),
      main_cnae: firstCnae.code,
      secondary_cnae: [],
    },
    {
      cnpj: '23456789000196',
      branch_type: 1,
      business_name: 'TECH INNOVATIONS SOLUCOES EM TI LTDA',
      status: '02',
      date_status: new Date('2024-01-10'),
      code_detail_status: '01',
      outer_city: null,
      coutry_code: null,
      start_date: new Date('2019-06-20'),
      type_of_place: 'Rua',
      place: 'da Consolação',
      house_number: '2000',
      address_complement: 'Conjunto 50',
      district: 'Consolação',
      cep: '01301000',
      uf: 'SP',
      city_code: '7107',
      ddd_1: '11',
      phone_1: '988765432',
      ddd_2: null,
      phone_2: null,
      ddd_fax: null,
      fax: null,
      email: 'contato@techinnovations.io',
      special_citation: null,
      special_citation_date: null,
      load_update_date: new Date(),
      main_cnae: firstCnae.code,
      secondary_cnae: [],
    },
    {
      cnpj: '34567890000197',
      branch_type: 1,
      business_name: 'EMPRESA TESTE COMERCIO E SERVICOS LTDA',
      status: '02',
      date_status: new Date('2024-02-01'),
      code_detail_status: '01',
      outer_city: null,
      coutry_code: null,
      start_date: new Date('2021-05-05'),
      type_of_place: 'Avenida',
      place: 'Brigadeiro Faria Lima',
      house_number: '3000',
      address_complement: 'Andar 10',
      district: 'Itaim Bibi',
      cep: '04538132',
      uf: 'SP',
      city_code: '7107',
      ddd_1: '11',
      phone_1: '999988888',
      ddd_2: null,
      phone_2: null,
      ddd_fax: null,
      fax: null,
      email: 'contato@empresateste.com.br',
      special_citation: null,
      special_citation_date: null,
      load_update_date: new Date(),
      main_cnae: firstCnae.code,
      secondary_cnae: [],
    },
  ];

  let inseridos = 0;
  let atualizados = 0;

  console.log('\n[COMPANIES SEED - SAMPLE DATA]');
  console.log('  ⚠ Este seed contém apenas dados de exemplo');
  console.log('  ⚠ Para produção, importe dados reais da Receita Federal\n');

  for (const company of companies) {
    const existing = await prisma.company.findUnique({
      where: { cnpj: company.cnpj },
    });

    if (existing) {
      await prisma.company.update({
        where: { id: existing.id },
        data: company,
      });
      atualizados++;
      console.log(`  ↻ Empresa atualizada: ${company.business_name}`);
    } else {
      await prisma.company.create({
        data: company,
      });
      inseridos++;
      console.log(`  ✓ Empresa criada: ${company.business_name}`);
    }
  }

  console.log(`\n  Resumo: ${inseridos} criados, ${atualizados} atualizados\n`);

  await prisma.$disconnect();
}
