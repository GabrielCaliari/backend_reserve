# Seed Coverage Report

## ✅ Entidades com Seeds Completos

### zarp-auth
- [x] **Admin** - 5 admins (1 super_admin, 3 ativos, 1 inativo)
- [x] **Tenant** - 4 tenants (3 ativos, 1 inativo)
- [x] **AdminTenant** - Vínculos admin-tenant com roles específicos
- [x] **AdminCredential** - Credenciais hasheadas para todos os admins

### shared
- [x] **Plan** - 5 planos (Free, Starter, Professional, Enterprise, Legacy)
- [x] **TokenPack** - 5 pacotes de tokens com diferentes descontos

### zarp-cms
- [x] **Author** - 5 autores distribuídos entre tenants
- [x] **Blog** - 3 blogs (1 por tenant ativo)
- [x] **Article** - 6 artigos (5 publicados, 1 rascunho) com conteúdo técnico real
- [x] **StorageCollection** - 2 collections (author-avatars, article-images)

### zarp-leads
- [x] **LeadCollection** - 6 collections com diferentes access modes
- [x] **Lead** - 7 leads distribuídos entre collections

### zarp-mailer
- [x] **SMTPServer** - 4 servidores SMTP (Gmail, SendGrid, AWS SES, Test)

## ⚠️ Entidades Sem Seeds (Dados Gerados em Runtime)

### zarp-auth
- [ ] **AdminSessionToken** - Gerado no login
- [ ] **AdminCredential** - Criado junto com Admin

### zarp-cms
- [ ] **MediaAsset** - Requer upload real de arquivos
- [ ] **ArticleImage** (deprecated) - Tabela legacy

### zarp-leads
- [ ] **Lead** - Alguns leads já seedados, mais serão criados via API

### zarp-mailer
- [ ] **EmailCampaign** - Criado via interface administrativa
- [ ] **EmailCampaignLead** - Relacionamento criado ao associar leads

### zarp-cnpjs (Opcional - Datasets Grandes)
- [ ] **Company** - Dataset muito grande (milhões de registros)
- [ ] **AuxiliaryCompanyInformation** - Dataset complementar
- [ ] **CNAE** - Tabela de códigos CNAE (pode ser seedada se necessário)

### zarp-brands
- [ ] **Brand** - Dados de marcas INPI (criados via importação)
- [ ] **BrandAlert** - Alertas criados por usuários

### zarp-journals
- [ ] **Journal** - Diários oficiais (importados via processamento)
- [ ] **JournalAlert** - Alertas configurados por usuários

## 📊 Estatísticas

### Total de Seeds Implementados
- **Arquivos de seed**: 13
- **Entidades seedadas**: 11
- **Registros totais**: ~50+

### Distribuição por Módulo
| Módulo | Seeds | Registros |
|--------|-------|-----------|
| zarp-auth | 2 | ~15 |
| shared | 2 | ~10 |
| zarp-cms | 5 | ~20 |
| zarp-leads | 2 | ~13 |
| zarp-mailer | 1 | ~4 |

## 🎯 Próximas Expansões Recomendadas

### 1. MediaAssets (Alta Prioridade)
Adicionar imagens reais para:
- Avatares de autores
- Covers de artigos
- Imagens inline em artigos

**Implementação sugerida:**
```typescript
// prisma/seeds/zarp-cms/storage/media-assets.seed.ts
// Usar imagens de placeholder services ou assets locais
```

### 2. Email Campaigns (Média Prioridade)
Criar campanhas de exemplo:
- Newsletter semanal
- Campanha promocional
- Sequência de onboarding

### 3. CNAE Codes (Baixa Prioridade)
Se necessário para testes:
```typescript
// prisma/seeds/zarp-cnpjs/cnaes.seed.ts
// Importar lista oficial de CNAEs
```

## 🔄 Manutenção

### Quando Adicionar Novos Seeds

1. **Nova entidade criada**: Adicione seed se for dado mestre ou de teste
2. **Novo módulo**: Crie pasta `prisma/seeds/zarp-[modulo]/`
3. **Novos relacionamentos**: Atualize seeds existentes

### Checklist para Novo Seed

- [ ] Criar arquivo em `prisma/seeds/[modulo]/[entidade].seed.ts`
- [ ] Exportar função `seed[Entidade]()`
- [ ] Adicionar import em `prisma/seeds.ts`
- [ ] Adicionar chamada na ordem correta
- [ ] Testar execução isolada
- [ ] Testar execução completa
- [ ] Atualizar este documento

## 📝 Notas

### Dados Sensíveis
- Senhas são hasheadas com PBKDF2
- Secret keys são hasheadas
- Dados de teste não devem ser usados em produção

### Idempotência
Todos os seeds são idempotentes:
- Verificam existência antes de criar
- Atualizam se já existe
- Deletam apenas o que não está na lista (admins)

### Performance
- Seeds executam em ~5-10 segundos
- Podem ser executados múltiplas vezes
- Não afetam dados de produção se executados corretamente
