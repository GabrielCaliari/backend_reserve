import 'dotenv/config';
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function seedPlan() {
    const plans = [
        {
            name: 'plano grátis',
            slug: 'plano-gratis',
            maximum_queries: 15
        }
    ];

    async function insertIfNotExists(plans) {
        let inseridos = 0;
        let jaExistentes = 0;

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
                console.log(`Plano ${_plan.name} inserida`);
            } else {
                jaExistentes++;
                console.log(`Plano ${_plan.name} já existe`);
            }
        }

        return { inseridos, jaExistentes };
    }

    const resultado = await insertIfNotExists(plans);

    console.log(`\n----------------------------------------------------------------------------------\n`);
    console.log(`Planos inseridas: ${resultado.inseridos}, já existentes: ${resultado.jaExistentes}`);
    console.log(`\n----------------------------------------------------------------------------------\n`);
}