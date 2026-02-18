import 'dotenv/config';
import { PrismaClient, ECollectionAccessMode } from "@/generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Hash a secret key for collection authentication */
function hashSecretKey(value: string): { salt: string; hash: string } {
    const pk = process.env.ENCRYPT_PRIVATE_KEY;
    if (!pk) throw new Error('ENCRYPT_PRIVATE_KEY env var not set');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(value, salt + pk, 856, 64, 'sha512').toString('hex');
    return { salt, hash };
}

export async function seedLeadCollection() {
    const collections = [
        {
            name: 'Coleção Pública Geral',
            slug: 'colecao-publica-geral',
            source: 'website',
            access_mode: ECollectionAccessMode.public,
            allowed_domains: [],
            secret_key: null,
            tenantSlug: 'zarp-studio',
        },
        {
            name: 'Coleção Privada Teste',
            slug: 'colecao-privada-teste',
            source: 'landing-page',
            access_mode: ECollectionAccessMode.private,
            allowed_domains: [],
            secret_key: 'secret-key-123',
            tenantSlug: 'empresa-teste',
        },
        {
            name: 'Coleção Restrita Domínios',
            slug: 'colecao-restrita-dominios',
            source: 'api',
            access_mode: ECollectionAccessMode.restricted,
            allowed_domains: ['teste.com.br', 'exemplo.com'],
            secret_key: null,
            tenantSlug: 'empresa-teste',
        },
    ];

    let inseridos = 0;
    let atualizados = 0;

    for (const collection of collections) {
        const tenant = await prisma.tenant.findUnique({
            where: { slug: collection.tenantSlug },
        });

        if (!tenant) {
            console.log(`[SKIP] Tenant "${collection.tenantSlug}" não encontrado para coleção "${collection.name}"`);
            continue;
        }

        const existing = await prisma.leadCollection.findUnique({
            where: { slug: collection.slug },
        });

        const data: any = {
            name: collection.name,
            slug: collection.slug,
            source: collection.source,
            access_mode: collection.access_mode,
            allowed_domains: collection.allowed_domains,
            tenant_id: tenant.id,
            active: true,
        };

        // Add secret key hash if provided
        if (collection.secret_key) {
            const { hash, salt } = hashSecretKey(collection.secret_key);
            data.secret_key_hash = hash;
            data.secret_key_salt = salt;
        }

        if (existing) {
            await prisma.leadCollection.update({
                where: { id: existing.id },
                data,
            });
            atualizados++;
        } else {
            await prisma.leadCollection.create({ data });
            inseridos++;
        }
    }

    console.log(`\n----------------------------------------------------------------------------------\n`);
    console.log(`LeadCollections inseridas: ${inseridos}, atualizadas: ${atualizados}`);
    console.log(`\n----------------------------------------------------------------------------------\n`);
}
