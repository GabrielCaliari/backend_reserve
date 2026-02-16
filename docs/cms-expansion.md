Plano de Implementação: Multi-Tenant CMS com Blog e RBAC
Vou analisar o estado atual do projeto e propor um plano de implementação completo.

1. Diagnóstico do Estado Atual
Antes de tudo, preciso entender o que já existe no repositório para mapear os gaps.

Análise dos Pontos Críticos
Aspecto	Problema Identificado	Impacto
Modelo de Admin	Admin provavelmente tem relação 1:1 com tenant (empresa)	Impede super-admin e admin multi-empresa
Sistema de Roles	Ausente ou simplificado (JWT com role fixa)	Sem controle granular de permissões
CMS/Blog	Inexistente	Módulo inteiro a ser criado
Storage	Sem integração com Vercel Blob	Necessário para imagens dos artigos
2. Modelo de Domínio Proposto
2.1 Bounded Contexts Afetados
2.2 Modelo Relacional (ERD Textual)
2.3 Enums de Domínio
3. Plano de Implementação por Fases
Fase 1: RBAC e Reestruturação de Admin (Fundação)
Prioridade: CRITICA - Tudo depende disso.

1.1 Migration Prisma
1.2 Schema Prisma (atualização)
1.3 Domain Layer - RBAC
1.4 Guards Atualizados
Fase 2: Módulo zarp-cms (Blog + Artigos)
Prioridade: ALTA

2.1 Estrutura do Módulo
2.2 Domain Entities
2.3 Domain Interfaces (Ports)
2.4 Vercel Blob Storage Provider
2.5 Use Cases Principais
2.6 DTOs
2.7 Controllers
2.8 Blog API Key Guard
2.9 Module Wiring
Fase 3: Prisma Schema Completo do CMS
4. Rotas da API (Resumo)
Admin Routes (protegidas por JWT + Role)
Method	Route	Role Min.	Descrição
POST	/api/cms/blogs	manager	Criar blog
GET	/api/cms/blogs	viewer	Listar blogs do tenant
PUT	/api/cms/blogs/:blogId	editor	Atualizar blog
DELETE	/api/cms/blogs/:blogId	manager	Deletar blog
POST	/api/cms/blogs/:blogId/regenerate-key	owner	Regenerar secret key
POST	/api/cms/blogs/:blogId/articles	editor	Criar artigo
GET	/api/cms/blogs/:blogId/articles	viewer	Listar artigos
PUT	/api/cms/blogs/:blogId/articles/:articleId	editor	Atualizar artigo
DELETE	/api/cms/blogs/:blogId/articles/:articleId	editor	Deletar artigo
POST	/api/cms/blogs/:blogId/articles/:articleId/publish	editor	Publicar
POST	/api/cms/blogs/:blogId/articles/:articleId/archive	editor	Arquivar
PUT	/api/cms/blogs/:blogId/articles/reorder	editor	Reordenar artigos
POST	/api/cms/articles/:articleId/images	editor	Upload imagem
DELETE	/api/cms/articles/:articleId/images/:imageId	editor	Deletar imagem
PUT	/api/cms/articles/:articleId/images/reorder	editor	Reordenar imagens
Public Routes (protegidas por secret key)
Method	Route	Auth	Descrição
GET	/api/cms/public/articles	x-blog-secret-key header	Listar artigos publicados
GET	/api/cms/public/articles/:slug	x-blog-secret-key header	Artigo por slug
5. Sequência de Implementação (Sprint Plan)
Sprint	Duração	Entregas
Sprint 1	3-4 dias	Migration RBAC (Tenant, AdminTenant, is_super_admin), RolesGuard, atualizar JWT payload com tenants e roles
Sprint 2	2-3 dias	Domain layer completo do CMS (entities, VOs, enums, interfaces, errors) + testes unitários
Sprint 3	3-4 dias	Application layer (use cases Blog + Article) + testes com in-memory repos
Sprint 4	2-3 dias	Infrastructure: Prisma repositories + migration CMS tables
Sprint 5	2 dias	Controllers (admin CRUD) + Swagger docs
Sprint 6	1-2 dias	Vercel Blob Storage provider + upload/delete imagens
Sprint 7	1-2 dias	Public Blog API (endpoint + guard + presenter)
Sprint 8	1-2 dias	Integration tests + E2E para fluxos críticos
Total estimado: 15-20 dias de desenvolvimento

6. Dependências a Instalar
7. Pontos que Precisam de Clarificação
Antes de iniciar a implementação, gostaria de alinhar:

JWT Payload atual: Qual a estrutura do payload JWT atual? Preciso saber para adicionar tenants[] e isSuperAdmin sem quebrar contratos existentes.

Modelo Admin existente: O Admin atual tem alguma relação com "empresa" ou "tenant"? Existe tabela de tenants ou precisamos criar do zero?

Migration de dados existentes: Existem admins no banco que precisam ser migrados para o novo modelo? (setar um admin inicial como super_admin, criar tenants para dados existentes)

Limites de upload: Qual o tamanho máximo de imagem aceitável? (sugiro 5MB por imagem, 20 imagens por artigo)

Cache do endpoint público: O endpoint público de blog precisa de cache (Redis/CDN headers)?

Recomendo usar o comando /speckit.specify para detalhar a spec formalmente antes de iniciarmos a codificação.


8. CLARIFY ANSWERS

1. Investigue a melhor solução. 2. Existe sim. 3. O do seed resolve. 4. 10MB, mas deve ser recebido, compromido e otimizado por nós de qualquer formato para .webp sem perder muita qualidade. 5. por enquanto vamos fazer sem cache, mas adiciona TODOs no codigo para não esquecer de implementar, pois isso refelte na nossa escalabilidade. // Assim que esclarecer, realize a implementação incremental.

