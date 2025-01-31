import { PrismaClient } from '@prisma/client';

import { seedCnae } from "./seed/seed-cnae";
import { seedCNPJ } from "./seed/seed-company";
import { seedPlan } from "./seed/seed-plan";

(async function main() {

    const prisma = new PrismaClient();

    async function ensureViewExists() {
        const viewName = [
            "ViewCompany",
            "ViewCompany_AC", "ViewCompany_AL", "ViewCompany_AM", "ViewCompany_AP", "ViewCompany_BA",
            "ViewCompany_CE", "ViewCompany_DF", "ViewCompany_ES", "ViewCompany_GO", "ViewCompany_MA",
            "ViewCompany_MG", "ViewCompany_MS", "ViewCompany_MT", "ViewCompany_PA", "ViewCompany_PB",
            "ViewCompany_PE", "ViewCompany_PI", "ViewCompany_PR", "ViewCompany_RJ", "ViewCompany_RN",
            "ViewCompany_RO", "ViewCompany_RR", "ViewCompany_RS", "ViewCompany_SC", "ViewCompany_SE",
            "ViewCompany_SP", "ViewCompany_TO"
        ];

        try {
            // Verificar se a view já existe
            await Promise.all(viewName.map(async name => {
                const result = await prisma.$queryRaw
                    `SELECT EXISTS (
                    SELECT FROM information_schema.views
                    WHERE table_name = ${name.toLocaleLowerCase()}
                  ) AS exists`
                    ;

                const uf = name.split('_').length == 2 ? name.split('_')[1].toLocaleLowerCase() : null;

                if (result[0].exists) {
                    console.log(`A view "${name}" já existe.`);
                } else {
                    console.log(`A view "${name}" não existe. Criando...`);

                    // Criar a view
                    await prisma.$executeRawUnsafe(`
                    CREATE VIEW ${name} AS
                        SELECT
                            c.id AS company_id,
                            a.id AS auxiliary_company_information_id,
                            c.cnpj,
                            c.branch_type,
                            c.business_name,
                            c.status,
                            c.date_status,
                            c.code_detail_status,
                            c.outer_city,
                            c.coutry_code,
                            c.start_date,
                            c.type_of_place,
                            c.place,
                            c.house_number,
                            c.address_complement,
                            c.district,
                            c.cep,
                            c.uf,
                            c.city_code,
                            c.ddd_1,
                            c.phone_1,
                            c.ddd_2,
                            c.phone_2,
                            c.ddd_fax,
                            c.fax,
                            c.email,
                            c.special_citation,
                            c.special_citation_date,
                            c.load_update_date,
                            c.main_cnae,
                            c.secondary_cnae,
                            a.fantasy_name,
                            a.legal_nature,
                            a.qualification_representative_before_cnpj,
                            a.social_capital,
                            a.size,
                            a.federative_entity,
                            c.created_at AS company_created_at, 
                            c.updated_at AS company_updated_at
                        FROM
                            "public"."Company" c
                        LEFT JOIN
                            "public"."AuxiliaryCompanyInformation" a
                        ON
                            LEFT(c.cnpj, 8) = a.cnpj
                            ${uf ? `WHERE uf ILIKE '${uf}'` : ''}`);

                    console.log(`A view "${viewName}" foi criada com sucesso.`);
                }
            }))
        } catch (error) {
            console.error(`Erro ao verificar ou criar a view: ${error.message}`);
        } finally {
            await prisma.$disconnect();
        }
    }

    ensureViewExists();

    await seedCnae();
    await seedPlan();
    // await seedCNPJ();
})()