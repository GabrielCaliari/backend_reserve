import 'dotenv/config';
import { PrismaClient } from "../../../src/generated/prisma/client";
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
            name: 'Company Admin - Test',
            email: 'admin@test-company.com',
            password: 'Test@123456',
            role: 'company_admin' as const,
        },
        {
            name: 'Editor User',
            email: 'editor@zarp-studio.com',
            password: 'Editor@123456',
            role: 'company_admin' as const,
        },
        {
            name: 'Manager User',
            email: 'manager@test-company.com',
            password: 'Manager@123456',
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
            name: 'Test Company',
            slug: 'empresa-teste',
            domain: 'test-company.com',
        },
    ]

    /** Admin-tenant assignments: maps admin email -> tenant slugs with roles */
    const adminTenantAssignments = [
        { adminEmail: 'kelme.dev@pm.me', tenantSlug: 'zarp-studio', role: 'owner' as const },
        { adminEmail: 'admin@test-company.com', tenantSlug: 'empresa-teste', role: 'owner' as const },
        { adminEmail: 'editor@zarp-studio.com', tenantSlug: 'zarp-studio', role: 'editor' as const },
        { adminEmail: 'manager@test-company.com', tenantSlug: 'empresa-teste', role: 'manager' as const },
    ]

    async function deleteOldAdmins(admins: typeof admin) {
        // Fetch all admins from database
        const allAdmins = await prisma.admin.findMany();
        
        // Allowed emails in seed
        const allowedEmails = admins.map(a => a.email);
        
        // Admins to delete (not in the list)
        const adminsToDelete = allAdmins.filter(admin => !allowedEmails.includes(admin.email));
        
        let deleted = 0;
        
        for (const admin of adminsToDelete) {
            await prisma.$transaction(async (tx) => {
                // Delete tenant associations first
                await tx.adminTenant.deleteMany({
                    where: {
                        admin_id: admin.id
                    }
                });
                
                // Delete sessions
                await tx.adminSessionToken.deleteMany({
                    where: {
                        admin_id: admin.id
                    }
                });
                
                // Delete credentials (foreign key)
                await tx.adminCredential.deleteMany({
                    where: {
                        admin_id: admin.id
                    }
                });
                
                // Then delete the admin
                await tx.admin.delete({
                    where: {
                        id: admin.id
                    }
                });
            });
            
            deleted++;
            console.log(`Admin deleted: ${admin.email}`);
        }
        
        return deleted;
    }

    async function createAdmin(admins: typeof admin) {
        let inserted = 0;
        let updated = 0;

        for (const admin of admins) {
            const adminExists = await prisma.admin.findUnique({
                where: {
                    email: admin.email
                }
            })

            if (adminExists) {
                // Update existing admin (overwrite data)
                await prisma.$transaction(async (tx) => {
                    // Update admin information
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
    
                    // Update or create credentials
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

                updated++;
            } else {
                // Create new admin
                await prisma.$transaction(async (tx) => {
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
                });

                inserted++;
            }

        }
        
        return { inserted, updated };
    }

    async function seedTenants(tenantsList: typeof tenants) {
        let inserted = 0;
        let updated = 0;

        for (const tenant of tenantsList) {
            const existing = await prisma.tenant.findUnique({
                where: { slug: tenant.slug },
            });

            if (existing) {
                await prisma.tenant.update({
                    where: { id: existing.id },
                    data: { name: tenant.name, domain: tenant.domain },
                });
                updated++;
            } else {
                await prisma.tenant.create({
                    data: {
                        name: tenant.name,
                        slug: tenant.slug,
                        domain: tenant.domain,
                    },
                });
                inserted++;
            }
        }

        return { inserted, updated };
    }

    async function seedAdminTenantAssignments(assignments: typeof adminTenantAssignments) {
        let created = 0;
        let existing = 0;

        for (const assignment of assignments) {
            const admin = await prisma.admin.findUnique({ where: { email: assignment.adminEmail } });
            const tenant = await prisma.tenant.findUnique({ where: { slug: assignment.tenantSlug } });

            if (!admin || !tenant) {
                console.log(`[SKIP] Admin "${assignment.adminEmail}" or Tenant "${assignment.tenantSlug}" not found.`);
                continue;
            }

            const existingAssignment = await prisma.adminTenant.findUnique({
                where: { admin_id_tenant_id: { admin_id: admin.id, tenant_id: tenant.id } },
            });

            if (existingAssignment) {
                // Ensure it's active and has correct role
                await prisma.adminTenant.update({
                    where: { id: existingAssignment.id },
                    data: { 
                        active: true,
                        role: assignment.role || 'manager',
                    },
                });
                existing++;
            } else {
                await prisma.adminTenant.create({
                    data: { 
                        admin_id: admin.id, 
                        tenant_id: tenant.id, 
                        role: assignment.role || 'manager',
                        active: true 
                    },
                });
                created++;
            }
        }

        return { created, existing };
    }

    // First delete old admins not in the list
    const deleted = await deleteOldAdmins(admin);

    // Then create/update admins from the list
    const result = await createAdmin(admin);

    // Seed tenants
    const tenantResult = await seedTenants(tenants);

    // Seed admin-tenant assignments
    const assignmentResult = await seedAdminTenantAssignments(adminTenantAssignments);

    console.log(`\n----------------------------------------------------------------------------------\n`);
    console.log(`Admins deleted: ${deleted}, inserted: ${result.inserted}, updated: ${result.updated}`);
    console.log(`Tenants inserted: ${tenantResult.inserted}, updated: ${tenantResult.updated}`);
    console.log(`Admin-Tenant links created: ${assignmentResult.created}, already existing: ${assignmentResult.existing}`);
    console.log(`\n----------------------------------------------------------------------------------\n`);
}