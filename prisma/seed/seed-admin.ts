import 'dotenv/config';
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';

/** Standalone PBKDF2 hash for seed scripts (mirrors HashProvider) */
function hashPassword(value: string): { salt: string; hash: string } {
    const pk = process.env.ENCRYPT_PRIVATE_KEY;
    if (!pk) throw new Error('ENCRYPT_PRIVATE_KEY env var not set');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(value, salt + pk, 856, 64, 'sha512').toString('hex');
    return { salt, hash };
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function seedAdmin() {
    const admin = [
        {
            name: 'diego kelme superadmin',
            email: 'kelme.dev@pm.me',
            password: 'Vamos@Inovar@26',
            role: 'super_admin' as const,
        },
        {
            name: 'Admin Empresa Teste',
            email: 'admin@empresa-teste.com',
            password: 'Teste@123456',
            role: 'company_admin' as const,
        },
    ]

    /** Default tenants to seed */
    const tenants = [
        {
            name: 'Zarp Studio',
            slug: 'zarp-studio',
            domain: null,
        },
        {
            name: 'Empresa Teste',
            slug: 'empresa-teste',
            domain: 'teste.com.br',
        },
    ]

    /** Admin-tenant assignments: maps admin email -> tenant slugs */
    const adminTenantAssignments = [
        { adminEmail: 'kelme.dev@pm.me', tenantSlug: 'zarp-studio' },
        { adminEmail: 'admin@empresa-teste.com', tenantSlug: 'empresa-teste' },
    ]

    async function deleteOldAdmins(admins) {
        // Buscar todos os admins do banco
        const allAdmins = await prisma.admin.findMany();
        
        // Emails permitidos na seed
        const allowedEmails = admins.map(a => a.email);
        
        // Admins a serem deletados (que não estão na lista)
        const adminsToDelete = allAdmins.filter(admin => !allowedEmails.includes(admin.email));
        
        let deletados = 0;
        
        for (const admin of adminsToDelete) {
            await prisma.$transaction(async (tx) => {
                // Deletar associacoes com tenants primeiro
                await tx.adminTenant.deleteMany({
                    where: {
                        admin_id: admin.id
                    }
                });
                
                // Deletar sessoes
                await tx.adminSessionToken.deleteMany({
                    where: {
                        admin_id: admin.id
                    }
                });
                
                // Deletar credenciais (chave estrangeira)
                await tx.adminCredential.deleteMany({
                    where: {
                        admin_id: admin.id
                    }
                });
                
                // Depois deletar o admin
                await tx.admin.delete({
                    where: {
                        id: admin.id
                    }
                });
            });
            
            deletados++;
            console.log(`Admin deletado: ${admin.email}`);
        }
        
        return deletados;
    }

    async function createAdmin(admins) {
        let inseridos = 0;
        let atualizados = 0;

        for (const admin of admins) {
            const adminExists = await prisma.admin.findUnique({
                where: {
                    email: admin.email
                }
            })

            if (adminExists) {
                // Atualizar admin existente (sobrescrever dados)
                await prisma.$transaction(async (tx) => {
                    // Atualizar informacoes do admin
                    await tx.admin.update({
                        where: {
                            id: adminExists.id
                        },
                        data: {
                            name: admin.name,
                            email: admin.email,
                            role: admin.role ?? 'company_admin',
                        }
                    });
    
                    const { hash, salt } = hashPassword(admin.password);
    
                    // Atualizar ou criar credenciais
                    await tx.adminCredential.upsert({
                        where: {
                            admin_id: adminExists.id
                        },
                        update: {
                            hash,
                            salt,
                        },
                        create: {
                            hash,
                            salt,
                            admin_id: adminExists.id
                        }
                    });
                });

                atualizados++;
            } else {
                // Criar novo admin
                const result = await prisma.$transaction(async (tx) => {
                    const _admin = await tx.admin.create({
                        data: {
                            name: admin.name,
                            email: admin.email,
                            role: admin.role ?? 'company_admin',
                        }
                    });
    
                    const { hash, salt } = hashPassword(admin.password);
    
                    await tx.adminCredential.create({
                        data: {
                            hash,
                            salt,
                            admin_id: _admin.id
                        }
                    });
    
                    return _admin;
                });

                inseridos++;
            }

        }
        
        return { inseridos, atualizados };
    }

    async function seedTenants(tenantsList) {
        let inseridos = 0;
        let atualizados = 0;

        for (const tenant of tenantsList) {
            const existing = await prisma.tenant.findUnique({
                where: { slug: tenant.slug },
            });

            if (existing) {
                await prisma.tenant.update({
                    where: { id: existing.id },
                    data: { name: tenant.name, domain: tenant.domain },
                });
                atualizados++;
            } else {
                await prisma.tenant.create({
                    data: {
                        name: tenant.name,
                        slug: tenant.slug,
                        domain: tenant.domain,
                    },
                });
                inseridos++;
            }
        }

        return { inseridos, atualizados };
    }

    async function seedAdminTenantAssignments(assignments: { adminEmail: string; tenantSlug: string }[]) {
        let criados = 0;
        let existentes = 0;

        for (const assignment of assignments) {
            const admin = await prisma.admin.findUnique({ where: { email: assignment.adminEmail } });
            const tenant = await prisma.tenant.findUnique({ where: { slug: assignment.tenantSlug } });

            if (!admin || !tenant) {
                console.log(`[SKIP] Admin "${assignment.adminEmail}" ou Tenant "${assignment.tenantSlug}" nao encontrado.`);
                continue;
            }

            const existing = await prisma.adminTenant.findUnique({
                where: { admin_id_tenant_id: { admin_id: admin.id, tenant_id: tenant.id } },
            });

            if (existing) {
                // Garantir que esta ativo
                if (!existing.active) {
                    await prisma.adminTenant.update({
                        where: { id: existing.id },
                        data: { active: true },
                    });
                }
                existentes++;
            } else {
                await prisma.adminTenant.create({
                    data: { admin_id: admin.id, tenant_id: tenant.id, active: true },
                });
                criados++;
            }
        }

        return { criados, existentes };
    }

    // Primeiro deletar admins antigos que nao estao na lista
    const deletados = await deleteOldAdmins(admin);

    // Depois criar/atualizar os admins da lista
    const resultado = await createAdmin(admin);

    // Seed tenants
    const tenantResult = await seedTenants(tenants);

    // Seed admin-tenant assignments
    const assignmentResult = await seedAdminTenantAssignments(adminTenantAssignments);

    console.log(`\n----------------------------------------------------------------------------------\n`);
    console.log(`Admins deletados: ${deletados}, inseridos: ${resultado.inseridos}, atualizados: ${resultado.atualizados}`);
    console.log(`Tenants inseridos: ${tenantResult.inseridos}, atualizados: ${tenantResult.atualizados}`);
    console.log(`Admin-Tenant vinculos criados: ${assignmentResult.criados}, ja existentes: ${assignmentResult.existentes}`);
    console.log(`\n----------------------------------------------------------------------------------\n`);
}