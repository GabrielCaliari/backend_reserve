// @ts-nocheck
import 'dotenv/config';
import { PrismaClient, EArticleStatus } from "../../../src/generated/prisma/client";
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

export async function seedCMSExpanded() {
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

## Nossa Missão

Na Zarp Studio, acreditamos que a tecnologia deve ser acessível e transformadora. Nosso objetivo é compartilhar conhecimento e experiências que possam ajudar desenvolvedores e empresas a crescerem.

## O que esperar

Publicaremos regularmente artigos sobre:
- Arquitetura de software
- APIs e microserviços
- DevOps e infraestrutura
- Tendências do mercado

Fique ligado para mais conteúdos!`,
            slug: 'bem-vindo-blog-zarp-studio',
            status: EArticleStatus.published,
            display_order: 1,
            blogSlug: 'blog-zarp-studio',
            authorEmail: 'kelme.dev@pm.me',
        },
        {
            title: 'Como usar nossa API de forma eficiente',
            content: `# Como usar nossa API

Neste artigo, vamos explorar como integrar com nossa API de forma eficiente e segura.

## Autenticação

Para começar, você precisará de uma chave de API. Acesse o painel administrativo e gere suas credenciais.

\`\`\`bash
curl -H "Authorization: Bearer YOUR_TOKEN" \\
     https://api.zarpstudio.com/v2/companies
\`\`\`

## Rate Limiting

Nossa API implementa rate limiting para garantir a qualidade do serviço:
- 100 requisições por minuto para planos básicos
- 1000 requisições por minuto para planos enterprise

## Boas Práticas

1. **Cache**: Implemente cache local para reduzir chamadas
2. **Retry Logic**: Use exponential backoff para retentativas
3. **Webhooks**: Configure webhooks para eventos em tempo real

## Exemplos Práticos

Veja alguns exemplos de uso comum da API...`,
            slug: 'como-usar-nossa-api',
            status: EArticleStatus.published,
            display_order: 2,
            blogSlug: 'blog-zarp-studio',
            authorEmail: 'ana.silva@zarpstudio.com',
        },
        {
            title: 'Arquitetura de Microserviços: Lições Aprendidas',
            content: `# Arquitetura de Microserviços: Lições Aprendidas

Após 3 anos trabalhando com microserviços, compartilho aqui nossas principais lições.

## O que funcionou

- **Domain-Driven Design**: Separar serviços por domínio de negócio
- **Event Sourcing**: Para auditoria e rastreabilidade
- **API Gateway**: Centralização de autenticação e rate limiting

## Desafios Enfrentados

### Complexidade Operacional
Gerenciar múltiplos serviços requer ferramentas robustas de observabilidade.

### Consistência de Dados
Transações distribuídas são complexas. Usamos o padrão Saga.

### Comunicação entre Serviços
Optamos por mensageria assíncrona com RabbitMQ para desacoplamento.

## Conclusão

Microserviços não são bala de prata, mas quando bem implementados trazem benefícios significativos de escalabilidade e manutenibilidade.`,
            slug: 'arquitetura-microservicos-licoes',
            status: EArticleStatus.published,
            display_order: 3,
            blogSlug: 'blog-zarp-studio',
            authorEmail: 'kelme.dev@pm.me',
        },
        {
            title: 'DevOps: Automatizando Deploys com CI/CD',
            content: `# DevOps: Automatizando Deploys com CI/CD

Neste artigo, vou mostrar como configuramos nosso pipeline de CI/CD.

## Stack Utilizada

- **GitHub Actions**: Orquestração de workflows
- **Docker**: Containerização
- **Kubernetes**: Orquestração de containers
- **ArgoCD**: GitOps para deploys

## Pipeline de Deploy

1. **Build**: Compilação e testes unitários
2. **Test**: Testes de integração e E2E
3. **Security Scan**: Análise de vulnerabilidades
4. **Deploy Staging**: Deploy automático em staging
5. **Deploy Production**: Deploy manual com aprovação

## Monitoramento

Usamos Prometheus + Grafana para métricas e alertas em tempo real.`,
            slug: 'devops-automatizando-deploys',
            status: EArticleStatus.published,
            display_order: 4,
            blogSlug: 'blog-zarp-studio',
            authorEmail: 'carlos.mendes@zarpstudio.com',
        },
        {
            title: 'Design System: Construindo Componentes Reutilizáveis',
            content: `# Design System: Construindo Componentes Reutilizáveis

Um design system bem estruturado acelera o desenvolvimento e garante consistência.

## Atomic Design

Seguimos a metodologia Atomic Design:
- **Átomos**: Botões, inputs, labels
- **Moléculas**: Formulários, cards
- **Organismos**: Headers, footers, sidebars
- **Templates**: Layouts de página
- **Páginas**: Instâncias específicas

## Ferramentas

- **Figma**: Design e prototipação
- **Storybook**: Documentação de componentes
- **TailwindCSS**: Estilização utilitária

## Benefícios

- Desenvolvimento mais rápido
- Consistência visual
- Facilita onboarding de novos devs`,
            slug: 'design-system-componentes-reutilizaveis',
            status: EArticleStatus.published,
            display_order: 5,
            blogSlug: 'blog-zarp-studio',
            authorEmail: 'maria.santos@teste.com.br',
        },
        {
            title: 'TypeScript: Além do Básico',
            content: `# TypeScript: Além do Básico

TypeScript oferece recursos poderosos além da tipagem básica.

## Generics Avançados

\`\`\`typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object 
    ? DeepPartial<T[P]> 
    : T[P];
};
\`\`\`

## Conditional Types

\`\`\`typescript
type IsString<T> = T extends string ? true : false;
\`\`\`

## Template Literal Types

\`\`\`typescript
type HTTPMethod = 'GET' | 'POST';
type Endpoint = \`/api/\${string}\`;
type Route = \`\${HTTPMethod} \${Endpoint}\`;
\`\`\`

Esses recursos permitem criar APIs type-safe e auto-documentadas.`,
            slug: 'typescript-alem-do-basico',
            status: EArticleStatus.draft,
            display_order: 6,
            blogSlug: 'blog-zarp-studio',
            authorEmail: 'ana.silva@zarpstudio.com',
        },
        {
            title: 'Artigo de Teste - Empresa Teste',
            content: `# Artigo de Teste

Este é um artigo de demonstração para o blog da Empresa Teste.

## Conteúdo de Exemplo

Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
            slug: 'artigo-teste-empresa',
            status: EArticleStatus.published,
            display_order: 1,
            blogSlug: 'blog-empresa-teste',
            authorEmail: 'maria.santos@teste.com.br',
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

    // Get first active admin for created_by and last_edited_by
    const firstAdmin = await prisma.admin.findFirst({
        where: { active: true },
        orderBy: { created_at: 'asc' },
    });

    if (!firstAdmin) {
        console.log('[ERROR] Nenhum admin ativo encontrado. Execute seed-admin primeiro.');
        return;
    }

    // Seed articles
    for (const article of articles) {
        const blog = await prisma.blog.findFirst({
            where: { slug: article.blogSlug },
        });

        if (!blog) {
            console.log(`[SKIP] Blog "${article.blogSlug}" não encontrado para artigo "${article.title}"`);
            continue;
        }

        // Find author by email
        const author = await prisma.author.findFirst({
            where: { email: article.authorEmail },
        });

        if (!author) {
            console.log(`[SKIP] Autor "${article.authorEmail}" não encontrado para artigo "${article.title}"`);
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
            author_id: author.id,
            created_by_admin_id: firstAdmin.id,
            last_edited_by_admin_id: firstAdmin.id,
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
