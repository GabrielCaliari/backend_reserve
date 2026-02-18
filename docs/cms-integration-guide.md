# Guia de Integração: CMS Blogs e Artigos

## Visão Geral do Sistema

A API ZARP oferece um sistema de CMS (Content Management System) para gerenciamento de blogs e artigos, dividido em duas camadas distintas de acesso:

**Camada Pública**: Endpoints para consumo no frontend público, requerendo apenas uma chave secreta do blog.

**Camada Administrativa**: Endpoints para gerenciamento completo do CMS, requerendo autenticação JWT de administrador com controle de permissões baseado em roles.

---

## Arquitetura de Autenticação

### Endpoints Públicos
Utilizam rolando permissões por nível de acesso

Os níveis de permissão seguem uma hierarquia: viewer (visualização), editor (edição de conteúdo), manager (gerenciamento de blogs), owner (controle total incluindo chaves de segurança).

---

## Rotas Públicas - Consumo Frontend

### Rota: Listagem de Artigos Publicados
**Endpoint**: `GET /api/cms/public/articles`

**Responsabilidade**: Retornar uma coleção paginada de artigos no status publicado, ordenados por ordem de exibição definida pelo administrador.

**Parâmetros de Entrada**:
- page: Número da página solicitada (padrão 1)
- limit: Quantidade de artigos por página (padrão 10, máximo 50)

**Estrutura de Resposta**:
A resposta é dividida em duas seções principais:
- data: Array contendo os artigos com seus metadados e imagens associadas
- meta: Objeto com informações de paginação (página atual, total de páginas, total de registros)

**Comportamento**:
- Filtra automaticamente apenas artigos com status "published"
- Ordena por display_order em ordem crescente
- Aplica paginação no lado do servidor
- Inclui todas as imagens associadas a cada artigo, também ordenadas

**Casos de Uso**:
- Página inicial do blog listando últimos artigos
- Seção de notícias ou atualizações
- Feed de conteúdo com scroll infinito
- Listagem categorizada de artigos

---

### Rota: Detalhes de Artigo por Slug
**Endpoint**: `GET /api/cms/public/articles/:slug`

**Responsabilidade**: Retornar os dados completos de um artigo específico identificado por seu slug único.

**Parâmetros de Entrada**:
- slug: Identificador textual único do artigo (parte da URL)

**Estrutura de Resposta**:
Retorna um objeto único contendo:
- Metadados do artigo (id, título, slug, status)
- Conteúdo completo (pode ser HTML ou Markdown)
- Timestamps de publicação, criação e última atualização
- Array de imagens ordenadas por display_order

**Comportamento**:
- Valida que o artigo pertence ao blog autenticado pela chave secreta
- Retorna apenas artigos com status "published"
- Retorna 404 se artigo não existir ou não estiver publicado
- Inclui metadados temporais para cache e histórico

**Casos de Uso**:
- Página individual de artigo
- Visualização detalhada de conteúdo
- Compartilhamento via URL amigável
- SEO e indexação por mecanismos de busca

---

## Rotas Administrativas - Gerenciamento de Blogs

### Rota: Criar Blog
**Endpoint**: `POST /blogs`

**Responsabilidade**: Criar uma nova instância de blog dentro do tenant atual, gerando automaticamente uma chave secreta única.

**Permissão Requerida**: Manager ou superior

**Dados de Entrada**:
- name: Nome do blog (máximo 150 caracteres)
- description: Descrição opcional do blog

**Comportamento**:
- Gera automaticamente um slug único baseado no nome
- Cria uma chave secreta criptograficamente segura
- Associa o blog ao tenant do administrador autenticado
- Valida unicidade do slug dentro do tenant

**Casos de Uso**:
- Criação de novo blog corporativo
- Separação de conteúdo por departamento ou produto
- Múltiplos blogs para diferentes audiências

---

### Rota: Listar Blogs do Tenant
**Endpoint**: `GET /blogs`

**Responsabilidade**: Retornar todos os blogs pertencentes ao tenant do administrador autenticado.

**Permissão Requerida**: Viewer ou superior

**Comportamento**:
- Filtra automaticamente por tenant_id do administrador
- Retorna lista completa sem paginação (assumindo volume gerenciável)
- Inclui metadados e chave secreta de cada blog

**Casos de Uso**:
- Dashboard administrativo listando blogs gerenciados
- Seleção de blog para gerenciar artigos
- Visão geral de todos os blogs da organização

---

### Rota: Atualizar Blog
**Endpoint**: `PUT /blogs/:blogId`

**Responsabilidade**: Modificar metadados de um blog existente (nome e descrição).

**Permissão Requerida**: Editor ou superior

**Dados de Entrada**:
- name: Novo nome do blog (opcional)
- description: Nova descrição (opcional)

**Comportamento**:
- Valida que o blog pertence ao tenant do administrador
- Atualiza apenas campos fornecidos (partial update)
- Não permite modificar a chave secreta (rota específica para isso)

**Casos de Uso**:
- Renomear blog
- Atualizar descrição para refletir mudanças de propósito
- Correção de informações

---

### Rota: Deletar Blog
**Endpoint**: `DELETE /blogs/:blogId`

**Responsabilidade**: Remover permanentemente um blog e todos os seus artigos associados (cascade delete).

**Permissão Requerida**: Manager ou superior

**Comportamento**:
- Valida propriedade do blog pelo tenant
- Remove em cascata todos os artigos do blog
- Remove em cascata todas as imagens dos artigos
- Operação irreversível sem confirmação adicional

**Casos de Uso**:
- Descontinuação de blog
- Limpeza de blogs de teste
- Reorganização estrutural

---

### Rota: Regenerar Chave Secreta
**Endpoint**: `POST /blogs/:blogId/regenerate-key`

**Responsabilidade**: Gerar uma nova chave secreta para o blog, invalidando a anterior.

**Permissão Requerida**: Owner (máximo nível)

**Comportamento**:
- Gera nova chave criptograficamente segura
- Invalida imediatamente a chave anterior
- Retorna a nova chave na resposta (única oportunidade de visualização)
- Requer atualização manual em todos os frontends que consomem a API

**Casos de Uso**:
- Comprometimento de segurança da chave
- Rotação periódica de credenciais
- Revogação de acesso de terceiros

---

## Rotas Administrativas - Gerenciamento de Artigos

### Rota: Criar Artigo
**Endpoint**: `POST /api/cms/blogs/:blogId/articles`

**Responsabilidade**: Criar um novo artigo em status de rascunho (draft) dentro de um blog específico.

**Permissão Requerida**: Editor ou superior

**Dados de Entrada**:
- title: Título do artigo (máximo 255 caracteres)
- content: Conteúdo completo (suporta HTML ou Markdown)

**Comportamento**:
- Gera automaticamente um slug único baseado no título
- Cria artigo com status "draft" por padrão
- Associa ao blog especificado na URL
- Define display_order automaticamente (último da lista)
- Não define published_at até transição para "published"

**Casos de Uso**:
- Início de novo artigo para revisão
- Criação de conteúdo programado
- Rascunho colaborativo antes de publicação

---

### Rota: Listar Artigos do Blog
**Endpoint**: `GET /api/cms/blogs/:blogId/articles`

**Responsabilidade**: Retornar todos os artigos de um blog, com filtro opcional por status.

**Permissão Requerida**: Viewer ou superior

**Parâmetros de Entrada**:
- status: Filtro opcional (draft, published, archived)

**Comportamento**:
- Retorna artigos em todos os status se filtro não especificado
- Ordena por display_order
- Inclui metadados completos de cada artigo
- Não inclui imagens na listagem (apenas no detalhe)

**Casos de Uso**:
- Dashboard de gerenciamento de conteúdo
- Visualização de rascunhos pendentes
- Auditoria de artigos arquivados
- Planejamento editorial

---

### Rota: Buscar Artigo por ID
**Endpoint**: `GET /api/cms/blogs/:blogId/articles/:articleId`

**Responsabilidade**: Retornar dados completos de um artigo específico, independente do status.

**Permissão Requerida**: Viewer ou superior

**Comportamento**:
- Retorna artigo em qualquer status (draft, published, archived)
- Inclui todas as imagens associadas
- Valida que o artigo pertence ao blog especificado
- Retorna 404 se não encontrado ou não pertencer ao blog

**Casos de Uso**:
- Edição de artigo existente
- Pré-visualização de rascunho
- Revisão de conteúdo arquivado
- Auditoria de alterações

---

### Rota: Atualizar Artigo
**Endpoint**: `PUT /api/cms/blogs/:blogId/articles/:articleId`

**Responsabilidade**: Modificar título e/ou conteúdo de um artigo existente.

**Permissão Requerida**: Editor ou superior

**Dados de Entrada**:
- title: Novo título (opcional)
- content: Novo conteúdo (opcional)

**Comportamento**:
- Atualiza apenas campos fornecidos
- Não altera status do artigo
- Atualiza timestamp updated_at automaticamente
- Mantém slug original (não regenera)

**Casos de Uso**:
- Correção de erros em artigo publicado
- Atualização de conteúdo desatualizado
- Refinamento de rascunhos
- Edição colaborativa

---

### Rota: Deletar Artigo
**Endpoint**: `DELETE /api/cms/blogs/:blogId/articles/:articleId`

**Responsabilidade**: Remover permanentemente um artigo e todas as suas imagens associadas.

**Permissão Requerida**: Editor ou superior

**Comportamento**:
- Remove artigo do banco de dados
- Remove em cascata todas as imagens associadas
- Remove arquivos físicos de imagem do storage (S3)
- Operação irreversível

**Casos de Uso**:
- Remoção de conteúdo obsoleto
- Exclusão de rascunhos abandonados
- Conformidade com LGPD/GDPR (direito ao esquecimento)

---

### Rota: Publicar Artigo
**Endpoint**: `POST /api/cms/blogs/:blogId/articles/:articleId/publish`

**Responsabilidade**: Transicionar um artigo de status "draft" para "published", tornando-o visível publicamente.

**Permissão Requerida**: Editor ou superior

**Comportamento**:
- Valida que artigo está em status "draft"
- Altera status para "published"
- Define published_at com timestamp atual
- Retorna erro 409 se artigo não estiver em draft

**Casos de Uso**:
- Publicação de artigo revisado
- Lançamento de conteúdo programado
- Aprovação final de conteúdo

---

### Rota: Arquivar Artigo
**Endpoint**: `POST /api/cms/blogs/:blogId/articles/:articleId/archive`

**Responsabilidade**: Transicionar um artigo de status "published" para "archived", removendo-o da visualização pública.

**Permissão Requerida**: Editor ou superior

**Comportamento**:
- Valida que artigo está em status "published"
- Altera status para "archived"
- Mantém published_at original (histórico)
- Retorna erro 409 se artigo não estiver publicado

**Casos de Uso**:
- Remoção temporária de conteúdo desatualizado
- Ocultação de artigo sem deletar permanentemente
- Gestão de conteúdo sazonal

---

### Rota: Reordenar Artigos
**Endpoint**: `PUT /api/cms/blogs/:blogId/articles/reorder`

**Responsabilidade**: Definir a ordem de exibição dos artigos através do campo display_order.

**Permissão Requerida**: Editor ou superior

**Dados de Entrada**:
Array de objetos contendo:
- id: ID do artigo
- display_order: Nova posição numérica

**Comportamento**:
- Atualiza display_order de múltiplos artigos em uma transação
- Valida que todos os IDs pertencem ao blog especificado
- Não valida unicidade ou sequência dos números (permite gaps)

**Casos de Uso**:
- Destacar artigos importantes no topo
- Organização editorial personalizada
- Curadoria de conteúdo

---

## Estrutura de Dados

### Entidade: Blog
Representa um container de artigos com autenticação própria.

**Campos Principais**:
- id: Identificador numérico único
- tenant_id: Associação com organização proprietária
- name: Nome descritivo do blog
- slug: Identificador textual único para URLs
- description: Descrição opcional do propósito
- secret_key: Chave de autenticação para API pública
- created_at / updated_at: Timestamps de auditoria

**Relacionamentos**:
- Pertence a um Tenant (organização)
- Possui múltiplos Articles

---

### Entidade: Article
Representa um conteúdo individual dentro de um blog.

**Campos Principais**:
- id: Identificador numérico único
- blog_id: Referência ao blog proprietário
- title: Título do artigo
- slug: Identificador textual único dentro do blog
- content: Conteúdo completo (HTML ou Markdown)
- status: Estado do artigo (draft, published, archived)
- display_order: Ordem de exibição numérica
- published_at: Timestamp de publicação (null se não publicado)
- created_at / updated_at: Timestamps de auditoria

**Relacionamentos**:
- Pertence a um Blog
- Possui múltiplas ArticleImages

---

### Entidade: ArticleImage
Representa uma imagem associada a um artigo.

**Campos Principais**:
- id: Identificador numérico único
- article_id: Referência ao artigo proprietário
- url: URL completa da imagem no storage
- alt_text: Texto alternativo para acessibilidade
- display_order: Ordem de exibição numérica

**Relacionamentos**:
- Pertence a um Article

---

## Arquitetura de Componentes Frontend (SRP)

### Camada de Comunicação HTTP

**Componente: API Client**
Responsabilidade única: Configurar e fornecer instância HTTP com headers de autenticação pré-configurados.
- Gerencia base URL da API
- Injeta header de chave secreta automaticamente
- Configura timeouts e interceptors globais

**Componente: Query Functions**
Responsabilidade única: Encapsular chamadas HTTP específicas transformando parâmetros em requisições.
- Uma função por endpoint da API
- Transforma parâmetros de entrada em query strings ou body
- Retorna dados tipados da resposta

---

### Camada de Estado e Cache

**Componente: Query Hooks**
Responsabilidade única: Gerenciar estado assíncrono de uma requisição específica.
- Um hook por tipo de consulta (lista, detalhe, infinito)
- Configura estratégias de cache (staleTime, cacheTime)
- Expõe estados de loading, error, data
- Define chaves de cache únicas

**Componente: Query Client Provider**
Responsabilidade única: Fornecer contexto global de cache para toda aplicação.
- Configuração centralizada de defaults
- Gerenciamento de cache em memória
- Integração com DevTools

---

### Camada de Apresentação

**Componente: Article List Container**
Responsabilidade única: Orquestrar lógica de listagem e paginação.
- Gerencia estado de página atual
- Invoca hook de consulta com parâmetros
- Delega renderização para componentes de apresentação
- Controla navegação entre páginas

**Componente: Article Card**
Responsabilidade única: Renderizar preview visual de um artigo.
- Exibe título, imagem principal e data
- Fornece link para página de detalhe
- Aplica estilos de hover e transições
- Não contém lógica de negócio

**Componente: Article Detail Container**
Responsabilidade única: Orquestrar carregamento de artigo individual.
- Extrai slug dos parâmetros de rota
- Invoca hook de consulta de detalhe
- Delega renderização para componente de apresentação
- Gerencia estados de loading e erro

**Componente: Article Content Renderer**
Responsabilidade única: Renderizar conteúdo e imagens de um artigo.
- Exibe título, data de publicação e conteúdo
- Renderiza galeria de imagens ordenadas
- Aplica estilos de tipografia
- Sanitiza HTML se necessário

**Componente: Pagination Controls**
Responsabilidade única: Fornecer controles de navegação entre páginas.
- Botões de próxima/anterior
- Indicador de página atual
- Desabilita botões em limites
- Emite eventos de mudança de página

**Componente: Infinite Scroll Trigger**
Responsabilidade única: Detectar quando usuário alcançou fim da lista.
- Usa Intersection Observer API
- Dispara carregamento de próxima página
- Exibe indicador de carregamento
- Detecta fim da lista

---

### Camada de Tipos

**Componente: Type Definitions**
Responsabilidade única: Definir contratos de dados entre frontend e backend.
- Interfaces TypeScript para cada entidade
- Types para parâmetros de requisição
- Types para estruturas de resposta
- Enums para valores fixos (status)

---

## Estrutura de Dashboard Administrativo

### Módulo: Blog Management

**Tela: Lista de Blogs**
Propósito: Visão geral de todos os blogs do tenant.

Componentes:
- Blog List Container (orquestração)
- Blog Card (apresentação de cada blog)
- Create Blog Button (ação de criação)
- Blog Actions Menu (editar, deletar, regenerar chave)

Funcionalidades:
- Listagem de blogs com metadados
- Criação de novo blog via modal
- Edição inline de nome/descrição
- Visualização de chave secreta (com copy-to-clipboard)
- Regeneração de chave com confirmação
- Deleção com confirmação dupla

---

**Tela: Detalhes do Blog**
Propósito: Gerenciamento completo de um blog específico.

Componentes:
- Blog Header (nome, descrição, chave)
- Blog Settings Form (edição de metadados)
- Articles List (artigos deste blog)
- Blog Stats (métricas: total de artigos por status)

Funcionalidades:
- Edição de metadados do blog
- Visualização de estatísticas
- Navegação para gerenciamento de artigos
- Acesso rápido a ações críticas

---

### Módulo: Article Management

**Tela: Lista de Artigos**
Propósito: Visão geral de artigos com filtros e ações em massa.

Componentes:
- Article List Container (orquestração)
- Status Filter Tabs (draft, published, archived, all)
- Article Table Row (apresentação de cada artigo)
- Bulk Actions Toolbar (ações em múltiplos artigos)
- Create Article Button (ação de criação)

Funcionalidades:
- Listagem com filtro por status
- Ordenação drag-and-drop (reorder)
- Ações individuais (editar, publicar, arquivar, deletar)
- Busca por título
- Indicadores visuais de status

---

**Tela: Editor de Artigo**
Propósito: Criação e edição de conteúdo de artigo.

Componentes:
- Article Form (título e conteúdo)
- Rich Text Editor (edição de conteúdo)
- Image Gallery Manager (upload e ordenação de imagens)
- Article Preview (visualização em tempo real)
- Save Actions Toolbar (salvar, publicar, arquivar)

Funcionalidades:
- Edição de título com geração automática de slug
- Editor rico para conteúdo (WYSIWYG ou Markdown)
- Upload de múltiplas imagens
- Reordenação de imagens drag-and-drop
- Preview lado a lado
- Auto-save de rascunhos
- Transições de status com confirmação

---

**Tela: Visualização de Artigo**
Propósito: Preview de como artigo aparecerá publicamente.

Componentes:
- Article Content Renderer (mesmo do frontend público)
- Article Metadata Panel (informações administrativas)
- Quick Actions Toolbar (editar, publicar, arquivar)

Funcionalidades:
- Visualização idêntica ao frontend público
- Metadados administrativos (criado em, atualizado em, status)
- Ações rápidas sem sair da visualização

---

### Módulo: Image Management

**Tela: Galeria de Imagens do Artigo**
Propósito: Gerenciamento dedicado de imagens de um artigo.

Componentes:
- Image Upload Zone (drag-and-drop)
- Image Grid (thumbnails ordenáveis)
- Image Detail Modal (edição de alt text e ordem)
- Image Actions (deletar, definir como principal)

Funcionalidades:
- Upload múltiplo com preview
- Reordenação drag-and-drop
- Edição de texto alternativo
- Deleção com confirmação
- Indicador de imagem principal

---

## Fluxos de Trabalho Principais

### Fluxo: Publicação de Artigo

1. Administrador acessa lista de artigos em draft
2. Seleciona artigo para edição
3. Revisa conteúdo no editor
4. Adiciona/organiza imagens se necessário
5. Visualiza preview
6. Clica em "Publicar"
7. Sistema valida que artigo está em draft
8. Sistema altera status para published
9. Sistema define published_at
10. Artigo torna-se visível na API pública
11. Dashboard atualiza lista movendo artigo para tab "published"

---

### Fluxo: Criação de Novo Blog

1. Administrador acessa dashboard de blogs
2. Clica em "Criar Novo Blog"
3. Preenche nome e descrição em modal
4. Submete formulário
5. Sistema valida dados
6. Sistema gera slug único
7. Sistema gera chave secreta
8. Sistema cria blog no banco
9. Modal exibe chave secreta (única visualização)
10. Administrador copia chave para configurar frontend
11. Dashboard atualiza lista incluindo novo blog

---

### Fluxo: Reordenação de Artigos

1. Administrador acessa lista de artigos
2. Ativa modo de reordenação
3. Arrasta artigos para nova posição
4. Sistema atualiza display_order localmente
5. Administrador confirma nova ordem
6. Sistema envia array de IDs com novas posições
7. Backend atualiza em transação
8. Frontend público reflete nova ordem na próxima consulta

---

## Considerações de Segurança

### Isolamento de Tenant
Todos os endpoints administrativos validam que o recurso solicitado pertence ao tenant do administrador autenticado. Não é possível acessar blogs ou artigos de outros tenants mesmo conhecendo os IDs.

### Controle de Permissões
O sistema implementa RBAC (Role-Based Access Control) com quatro níveis. Cada endpoint valida o nível mínimo requerido antes de executar a ação.

### Chave Secreta do Blog
A chave é gerada com algoritmo criptograficamente seguro. Deve ser tratada como credencial sensível. Recomenda-se rotação periódica e armazenamento em variáveis de ambiente, nunca em código-fonte.

### Validação de Entrada
Todos os DTOs implementam validação com class-validator. Limites de tamanho são aplicados para prevenir ataques de negação de serviço.

### Sanitização de Conteúdo
O campo content aceita HTML, mas deve ser sanitizado no frontend antes de renderização para prevenir XSS. Recomenda-se uso de bibliotecas como DOMPurify.

---

## Considerações de Performance

### Cache de Consultas
A API pública tem TODOs para implementar cache HTTP (Cache-Control, ETag). Enquanto isso, o cache deve ser gerenciado no frontend via TanStack Query com staleTime apropriado.

### Paginação
A listagem pública implementa paginação server-side com limite máximo de 50 itens por página para prevenir sobrecarga.

### Ordenação
Artigos são ordenados por display_order, que é indexado no banco de dados para performance.

### Imagens
URLs de imagens são completas e apontam para CDN (S3). Recomenda-se uso de Next.js Image component para otimização automática.

---

## Extensibilidade Futura

### Categorização
O sistema atual não implementa categorias ou tags. Pode ser adicionado com nova tabela ArticleCategory e relacionamento many-to-many.

### Versionamento de Conteúdo
Não há histórico de versões. Pode ser implementado com tabela ArticleVersion armazenando snapshots de conteúdo.

### Agendamento de Publicação
Não há suporte para publicação futura. Pode ser implementado com campo scheduled_publish_at e job scheduler.

### Comentários
Não há sistema de comentários. Pode ser integrado com serviço terceiro (Disqus) ou implementado com tabela ArticleComment.

### Analytics
Não há tracking de visualizações. Pode ser implementado com tabela ArticleView ou integração com Google Analytics.

### Busca Full-Text
Busca atual é por slug exato. Pode ser implementado com PostgreSQL full-text search ou Elasticsearch.

### Multilíngue
Não há suporte para múltiplos idiomas. Pode ser implementado com tabela ArticleTranslation.

### SEO Metadata
Não há campos dedicados para meta description, keywords, og:image. Pode ser adicionado ao schema Article.
