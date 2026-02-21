import 'dotenv/config';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * CNAE Seed - Sample data only
 * 
 * This seed contains only a small sample of CNAE codes for testing.
 * For production, import the full CNAE table from official sources.
 * 
 * Full CNAE data: https://concla.ibge.gov.br/busca-online-cnae.html
 */
export async function seedCNAEs() {
  const cnaes = [
    { code: '6201500', name: 'Desenvolvimento de programas de computador sob encomenda' },
    { code: '6202300', name: 'Desenvolvimento e licenciamento de programas de computador customizáveis' },
    { code: '6203100', name: 'Desenvolvimento e licenciamento de programas de computador não-customizáveis' },
    { code: '6204000', name: 'Consultoria em tecnologia da informação' },
    { code: '6209100', name: 'Suporte técnico, manutenção e outros serviços em tecnologia da informação' },
    { code: '6311900', name: 'Tratamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet' },
    { code: '6319400', name: 'Portais, provedores de conteúdo e outros serviços de informação na internet' },
    { code: '7020400', name: 'Atividades de consultoria em gestão empresarial' },
    { code: '7311400', name: 'Agências de publicidade' },
    { code: '7312200', name: 'Agenciamento de espaços para publicidade, exceto em veículos de comunicação' },
    { code: '7319000', name: 'Publicidade' },
    { code: '7320300', name: 'Pesquisas de mercado e de opinião pública' },
    { code: '7490104', name: 'Atividades de intermediação e agenciamento de serviços e negócios em geral' },
    { code: '8599699', name: 'Outras atividades de ensino não especificadas anteriormente' },
    { code: '9511800', name: 'Reparação e manutenção de computadores e de equipamentos periféricos' },
  ];

  let inseridos = 0;
  let atualizados = 0;

  console.log('\n[CNAES SEED - SAMPLE DATA]');
  console.log('  ⚠ Este seed contém apenas dados de exemplo');
  console.log('  ⚠ Para produção, importe a tabela CNAE completa\n');

  for (const cnae of cnaes) {
    const existing = await prisma.cnae.findFirst({
      where: { code: cnae.code },
    });

    if (existing) {
      await prisma.cnae.update({
        where: { id: existing.id },
        data: { name: cnae.name },
      });
      atualizados++;
    } else {
      await prisma.cnae.create({
        data: cnae,
      });
      inseridos++;
      console.log(`  ✓ CNAE criado: ${cnae.code} - ${cnae.name}`);
    }
  }

  console.log(`\n  Resumo: ${inseridos} criados, ${atualizados} atualizados\n`);

  await prisma.$disconnect();
}
