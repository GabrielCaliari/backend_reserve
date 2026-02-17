import 'dotenv/config';
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function seedPlan() {
    const plans = [
        {
            name: 'Plano Grátis',
            slug: 'plano-gratis',
            maximum_queries: 15,
            maximum_queries_to_export: 0,
            maximum_brand_analysis: 0,
            month_price_id: null,
            annual_price_id: null,
        },
        {
            name: 'Plano Básico',
            slug: 'plano-basico',
            maximum_queries: 100,
            maximum_queries_to_export: 50,
            maximum_brand_analysis: 5,
            month_price_id: 'price_stripe_basic_month',
            annual_price_id: 'price_stripe_basic_year',
        },
        {
            name: 'Plano Profissional',
            slug: 'plano-profissional',
            maximum_queries: 500,
            maximum_queries_to_export: 250,
            maximum_brand_analysis: 20,
            month_price_id: 'price_stripe_pro_month',
            annual_price_id: 'price_stripe_pro_year',
        },
        {
            name: 'Plano Empresarial',
            slug: 'plano-empresarial',
            maximum_queries: 2000,
            maximum_queries_to_export: 1000,
            maximum_brand_analysis: 100,
            month_price_id: 'price_stripe_enterprise_month',
            annual_price_id: 'price_stripe_enterprise_year',
        },
    ];

    async function insertIfNotExists(plans: any[]) {
        let inseridos = 0;
        let atualizados = 0;

        for (const _plan of plans) {
            const exists = await prisma.plan.findUnique({
                where: {
                    slug: _plan.slug,
                }
            });

            if (!exists) {
                await prisma.plan.create({
                    data: _plan,
                });
                inseridos++;
            } else {
                // Atualizar plano existente
                await prisma.plan.update({
                    where: { id: exists.id },
                    data: {
                        name: _plan.name,
                        maximum_queries: _plan.maximum_queries,
                        maximum_queries_to_export: _plan.maximum_queries_to_export,
                        maximum_brand_analysis: _plan.maximum_brand_analysis,
                        month_price_id: _plan.month_price_id,
                        annual_price_id: _plan.annual_price_id,
                    },
                });
                atualizados++;
            }
        }

        return { inseridos, atualizados };
    }

    const resultado = await insertIfNotExists(plans);

    console.log(`\n----------------------------------------------------------------------------------\n`);
    console.log(`Planos inseridos: ${resultado.inseridos}, atualizados: ${resultado.atualizados}`);
    console.log(`\n----------------------------------------------------------------------------------\n`);
}