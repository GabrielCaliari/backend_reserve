import 'dotenv/config';
import { PrismaClient } from "../../../src/generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function seedAuthors() {
    const authors = [
        {
            first_name: 'Sarah',
            last_name: 'Johnson',
            biography: 'Senior technology writer with over 10 years of experience covering software development, cloud computing, and digital transformation. Former software engineer turned tech journalist.',
            tenantSlug: 'zarp-studio',
        },
        {
            first_name: 'Michael',
            last_name: 'Chen',
            biography: 'Full-stack developer and technical writer specializing in modern web frameworks, API design, and DevOps practices. Passionate about making complex topics accessible.',
            tenantSlug: 'zarp-studio',
        },
        {
            first_name: 'Emma',
            last_name: 'Rodriguez',
            biography: 'UX designer and content strategist focused on user-centered design, accessibility, and inclusive digital experiences.',
            tenantSlug: 'zarp-studio',
        },
        {
            first_name: 'David',
            last_name: 'Thompson',
            biography: 'Test author for demonstration purposes. Covers various topics in technology and business.',
            tenantSlug: 'empresa-teste',
        },
    ];

    let inserted = 0;
    let updated = 0;

    for (const author of authors) {
        const tenant = await prisma.tenant.findUnique({
            where: { slug: author.tenantSlug },
        });

        if (!tenant) {
            console.log(`[SKIP] Tenant "${author.tenantSlug}" not found for author "${author.first_name} ${author.last_name}"`);
            continue;
        }

        const existing = await prisma.author.findFirst({
            where: {
                first_name: author.first_name,
                last_name: author.last_name,
                tenant_id: tenant.id,
            },
        });

        const data = {
            first_name: author.first_name,
            last_name: author.last_name,
            biography: author.biography,
            tenant_id: tenant.id,
            active: true,
        };

        if (existing) {
            await prisma.author.update({
                where: { id: existing.id },
                data,
            });
            updated++;
        } else {
            await prisma.author.create({ data });
            inserted++;
        }
    }

    console.log(`\n----------------------------------------------------------------------------------\n`);
    console.log(`Authors inserted: ${inserted}, updated: ${updated}`);
    console.log(`\n----------------------------------------------------------------------------------\n`);
}
