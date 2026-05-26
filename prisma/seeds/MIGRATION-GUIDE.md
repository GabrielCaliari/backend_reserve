# Seeds Migration Guide

## O que mudou?

A estrutura de seeds foi completamente reorganizada para seguir a arquitetura modular do projeto.

### Estrutura Antiga
```
prisma/seed/
├── seed-admin.ts
├── seed-cms.ts
├── seed-lead-collection.ts
├── seed-smtp-server.ts
├── seed-plan.ts
├── seed-token-pack.ts
└── ... (outros arquivos soltos)
```

### Nova Estrutura
```
prisma/seeds/
├── reserve-auth/          # Autenticação e autorização
│   ├── admins.seed.ts
│   └── tenants.seed.ts
├── reserve-cms/           # Sistema de conteúdo
│   ├── authors.seed.ts
│   ├── blogs.seed.ts
│   ├── articles.seed.ts
│   └── storage/
│       ├── author-avatars-collection.seed.ts
│       └── article-images-collection.seed.ts
├── reserve-leads/         # Gestão de leads
│   ├── collections.seed.ts
│   └── leads.seed.ts
├── reserve-mailer/        # Email e campanhas
│   └── smtp-servers.seed.ts
└── shared/             # Dados compartilhados
    ├── plans.seed.ts
    └── token-packs.seed.ts
```

## Melhorias Implementadas

### 1. Organização Modular
- Seeds agrupados por bounded context (módulo)
- Facilita manutenção e localização
- Reflete a arquitetura do código

### 2. Dados Realistas
- **Diego Kelme** mantido como super_admin
- Múltiplos admins com diferentes roles
- Blogs com artigos técnicos completos
- Leads com dados variados
- Múltiplos tenants para testes

### 3. Relacionamentos Completos
- Artigos vinculados a autores reais
- Leads vinculados a collections específicas
- Admins com vínculos tenant-específicos
- Storage collections configuradas

### 4. Estados Variados
- Entidades ativas e inativas
- Artigos publicados e em rascunho
- Collections com diferentes access modes
- Planos ativos e descontinuados

## Como Usar

### Executar todos os seeds
```bash
pnpm exec prisma db seed
```

### Ordem de Execução
Os seeds são executados automaticamente na ordem correta:

1. **reserve-auth**: Tenants → Admins
2. **shared**: Plans → Token Packs
3. **reserve-cms**: Authors → Blogs → Storage → Articles
4. **reserve-leads**: Collections → Leads
5. **reserve-mailer**: SMTP Servers

### Executar seed específico (desenvolvimento)
```bash
pnpm exec ts-node --compiler-options '{"module":"CommonJS"}' prisma/seeds/reserve-cms/articles.seed.ts
```

## Dados de Teste

### Admins
| Email | Password | Role | Tenant |
|-------|----------|------|--------|
| kelme.dev@pm.me | Vamos@Inovar@26 | super_admin | Todos |
| ana.silva@GabrielCaliari.com | Reserve@2024!Ana | owner | reserve-studio |
| carlos.mendes@empresateste.com | Teste@2024!Carlos | owner | empresa-teste |
| beatriz.costa@empresateste.com | Teste@2024!Bia | editor | empresa-teste |

### Tenants
- **reserve-studio**: Tenant principal da Gabriel Caliari
- **empresa-teste**: Tenant de demonstração
- **tech-innovations**: Tenant adicional para testes

### Blogs
- **Blog Gabriel Caliari**: 4 artigos técnicos publicados + 1 rascunho
- **Tech Insights**: Artigos sobre DevOps
- **Innovation Hub**: Conteúdo sobre inovação

### Lead Collections
- **website-reserve-studio**: Público, formulário principal
- **lp-black-friday-2024**: Restrito, campanha específica
- **api-parceiros-Reserve**: Privado, integração API
- **contato-empresa-teste**: Público, formulário de contato
- **webinar-tech-innovations**: Restrito, evento

## Próximos Passos

### Adicionar Imagens Reais
As storage collections estão criadas, mas ainda precisam de assets reais:

```typescript
// Exemplo de como adicionar imagens via seed
const avatarCollection = await prisma.storageCollection.findUnique({
  where: { slug: 'author-avatars' }
});

await prisma.mediaAsset.create({
  data: {
    filename: 'diego-kelme-avatar.jpg',
    storage_key: 'avatars/diego-kelme.jpg',
    url: 'https://storage.GabrielCaliari.com/avatars/diego-kelme.jpg',
    mime_type: 'image/jpeg',
    file_size: 245678,
    collection_id: avatarCollection.id,
    uploaded_by: firstAdmin.id,
  }
});
```

### Adicionar Mais Módulos
Quando novos módulos forem criados, adicione seeds em:
```
prisma/seeds/reserve-[novo-modulo]/
```

E importe no `seeds.ts` principal.

## Troubleshooting

### Erro: "Tenant não encontrado"
Execute os seeds na ordem correta. Tenants devem ser criados antes de qualquer outro dado.

### Erro: "Admin não encontrado"
Certifique-se de que os admins foram criados antes de tentar criar artigos ou outros dados que referenciam admins.

### Erro: "ENCRYPT_PRIVATE_KEY env var not set"
Configure a variável de ambiente `ENCRYPT_PRIVATE_KEY` no arquivo `.env`.

## Limpeza

Para remover os arquivos antigos após confirmar que tudo funciona:

```bash
# Backup primeiro!
mkdir -p prisma/seed-backup
mv prisma/seed/* prisma/seed-backup/

# Depois remova a pasta antiga
rm -rf prisma/seed
```
