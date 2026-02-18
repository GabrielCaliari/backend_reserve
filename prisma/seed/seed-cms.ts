import 'dotenv/config';
import { PrismaClient, EArticleStatus } from "../../src/generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Hash a secret key for blog authentication */
function hashSecretKey(value: string): { salt: string; hash: string } {
    const pk = process.env.ENCRYPT_PRIVATE_KEY;
    if (!pk) throw new Error('ENCRYPT_PRIVATE_KEY env var not set');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(value, salt + pk, 856, 64, 'sha512').toString('hex');
    return { salt, hash };
}

export async function seedCMS() {
    const blogs = [
        {
            name: 'Blog Zarp Studio',
            description: 'Blog oficial da Zarp Studio com artigos sobre tecnologia e inovação',
            slug: 'blog-zarp-studio',
            secret_key: 'zarp-blog-secret-2024',
            tenantSlug: 'zarp-studio',
        },
        {
            name: 'Blog Empresa Teste',
            description: 'Blog de teste para demonstração',
            slug: 'blog-empresa-teste',
            secret_key: 'teste-blog-secret-2024',
            tenantSlug: 'empresa-teste',
        },
    ];

    const articles = [
        {
            title: 'Bem-vindo ao Blog Zarp Studio',
            content: `# Bem-vindo ao Blog Zarp Studio

Este é o primeiro artigo do nosso blog. Aqui você encontrará conteúdos sobre:

- Desenvolvimento de software
- Tecnologias emergentes
- Boas práticas de programação
- Inovação e empreendedorismo

Fique ligado para mais conteúdos!`,
            slug: 'bem-vindo-blog-zarp-studio',
            status: EArticleStatus.published,
            display_order: 1,
            blogSlug: 'blog-zarp-studio',
        },
        {
            title: 'Como usar nossa API',
            content: `# Como usar nossa API

Neste artigo, vamos explorar como integrar com nossa API de forma eficiente.

## Autenticação

Para começar, você precisará de uma chave de API...`,
            slug: 'como-usar-nossa-api',
            status: EArticleStatus.published,
            display_order: 2,
            blogSlug: 'blog-zarp-studio',
        },
        {
            title: 'Artigo em Rascunho',
            content: 'Este é um artigo ainda em desenvolvimento...',
            slug: 'artigo-rascunho',
            status: EArticleStatus.draft,
            display_order: 3,
            blogSlug: 'blog-zarp-studio',
        },
    ];

    let blogsInseridos = 0;
    let blogsAtualizados = 0;

    // Seed blogs
    for (const blog of blogs) {
        const tenant = await prisma.tenant.findUnique({
            where: { slug: blog.tenantSlug },
        });

        if (!tenant) {
            console.log(`[SKIP] Tenant "${blog.tenantSlug}" não encontrado para blog "${blog.name}"`);
            continue;
        }

        const { hash, salt } = hashSecretKey(blog.secret_key);

        const existing = await prisma.blog.findFirst({
            where: {
                slug: blog.slug,
                tenant_id: tenant.id,
            },
        });

        const data = {
            name: blog.name,
            description: blog.description,
            slug: blog.slug,
            secret_key_hash: hash,
            secret_key_salt: salt,
            tenant_id: tenant.id,
            active: true,
        };

        if (existing) {
            await prisma.blog.update({
                where: { id: existing.id },
                data,
            });
            blogsAtualizados++;
        } else {
            await prisma.blog.create({ data });
            blogsInseridos++;
        }
    }

    let artigosInseridos = 0;
    let artigosAtualizados = 0;

    // Seed articles
    for (const article of articles) {
        const blog = await prisma.blog.findFirst({
            where: { slug: article.blogSlug },
        });

        if (!blog) {
            console.log(`[SKIP] Blog "${article.blogSlug}" não encontrado para artigo "${article.title}"`);
            continue;
        }

        const existing = await prisma.article.findFirst({
            where: {
                slug: article.slug,
                blog_id: blog.id,
            },
        });

        const data = {
            title: article.title,
            content: article.content,
            slug: article.slug,
            status: article.status,
            display_order: article.display_order,
            blog_id: blog.id,
            published_at: article.status === EArticleStatus.published ? new Date() : null,
        };

        if (existing) {
            await prisma.article.update({
                where: { id: existing.id },
                data,
            });
            artigosAtualizados++;
        } else {
            await prisma.article.create({ data });
            artigosInseridos++;
        }
    }

    console.log(`\n----------------------------------------------------------------------------------\n`);
    console.log(`Blogs inseridos: ${blogsInseridos}, atualizados: ${blogsAtualizados}`);
    console.log(`Artigos inseridos: ${artigosInseridos}, atualizados: ${artigosAtualizados}`);
    console.log(`\n----------------------------------------------------------------------------------\n`);
}
