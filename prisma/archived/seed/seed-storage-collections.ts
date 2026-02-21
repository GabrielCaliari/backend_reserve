import 'dotenv/config';
import { PrismaClient, EStorageCollectionAccessMode } from "../../../src/generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Hash a secret key for storage collection authentication */
function hashSecretKey(value: string): { salt: string; hash: string } {
    const pk = process.env.ENCRYPT_PRIVATE_KEY;
    if (!pk) throw new Error('ENCRYPT_PRIVATE_KEY env var not set');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(value, salt + pk, 856, 64, 'sha512').toString('hex');
    return { salt, hash };
}

export async function seedStorageCollections() {
    const collections = [
        {
            name: 'Article Images',
            slug: 'article-images',
            description: 'Storage for blog article images and media assets',
            access_mode: EStorageCollectionAccessMode.private,
            secret_key: 'article-images-secret-2024',
            allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            max_file_size_mb: 10,
            tenantSlug: 'zarp-studio',
        },
        {
            name: 'Author Avatars',
            slug: 'author-avatars',
            description: 'Profile pictures for blog authors',
            access_mode: EStorageCollectionAccessMode.private,
            secret_key: 'author-avatars-secret-2024',
            allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
            max_file_size_mb: 5,
            tenantSlug: 'zarp-studio',
        },
        {
            name: 'Public Assets',
            slug: 'public-assets',
            description: 'Publicly accessible images and files',
            access_mode: EStorageCollectionAccessMode.public,
            secret_key: null,
            allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
            max_file_size_mb: 5,
            tenantSlug: 'zarp-studio',
        },
        {
            name: 'Test Collection',
            slug: 'test-collection',
            description: 'Test storage collection for demonstration',
            access_mode: EStorageCollectionAccessMode.private,
            secret_key: 'test-collection-secret-2024',
            allowed_mime_types: ['image/jpeg', 'image/png'],
            max_file_size_mb: 5,
            tenantSlug: 'empresa-teste',
        },
    ];

    let inserted = 0;
    let updated = 0;

    for (const collection of collections) {
        const tenant = await prisma.tenant.findUnique({
            where: { slug: collection.tenantSlug },
        });

        if (!tenant) {
            console.log(`[SKIP] Tenant "${collection.tenantSlug}" not found for storage collection "${collection.name}"`);
            continue;
        }

        const existing = await prisma.storageCollection.findUnique({
            where: { slug: collection.slug },
        });

        const data: any = {
            name: collection.name,
            slug: collection.slug,
            description: collection.description,
            access_mode: collection.access_mode,
            allowed_mime_types: collection.allowed_mime_types,
            max_file_size_mb: collection.max_file_size_mb,
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
            await prisma.storageCollection.update({
                where: { id: existing.id },
                data,
            });
            updated++;
        } else {
            await prisma.storageCollection.create({ data });
            inserted++;
        }
    }

    console.log(`\n----------------------------------------------------------------------------------\n`);
    console.log(`Storage collections inserted: ${inserted}, updated: ${updated}`);
    console.log(`\n----------------------------------------------------------------------------------\n`);
}
