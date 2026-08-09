# RÉSERVE — Estrutura, Árvore de Navegação e UX
### Spec de construção para o time de Dev (front-end)

> **Relação com os outros arquivos:**
> `01_PLANO_PRODUTO` = o quê construir e por quê (estratégia/roadmap). `02_CONTRATO_API` = de onde vêm os dados (rotas). **Este (`03`) = como apresentar** (árvore, componentes, layout, estados).
> **Antes de codar:** validar o modo ATIVIDADE com Looker Studio + planilha (ver `01 §2.5`). Este spec é a construção custom para quando a validação confirmar que vale.
> **Convenção de status:** ✅ existe · 🆕 MVP (Fase 1) · 🔜 Fase 2 · 🔭 Fase 3.

---

## 1. Princípio que rege toda a tela

A dashboard é **um produto só** que se adapta ao cliente lendo `client.bookingEngine` + `integration.status`. Não há "duas versões". Há **dois modos de renderização** do mesmo produto (detalhe em `01 §2.5`):

```
modo CONVERSÃO  → cliente com motor conectado  → mostra ROAS, receita atribuída, funil
modo ATIVIDADE  → cliente sem motor            → esconde ROAS/funil; reserva = input manual
```

Três regras inquebráveis de exibição:
1. **Todo número tem selo de origem** (`auto` 🔌 / `server` 🎯 / `manual` ✍️). Sem selo, não vai pra tela.
2. **Campo sem fonte não vira zero.** Vira `EmptyState` com "via motor de reservas — em breve" ou simplesmente não é renderizado (modo ATIVIDADE não monta o card de ROAS).
3. **O front nunca calcula KPI.** Quem agrega é o backend (`GET /overview`). O front só formata e desenha.

---

## 2. Árvore de navegação (sitemap)

Duas áreas, dois papéis (ver `01 §2`). MVP marcado; Fase 2/3 já posicionados na árvore.

```
/login                                                  ✅  público

── ÁREA DO GERENTE (read-only) ───────────────────────────────────────
/dashboard/hotel
├── /overview                  Visão geral (tela herói)      🆕 ⭐
├── /ota                       OTA vs Direto + comissão       🆕
├── /reports                   Relatórios mensais (lista)     🆕
│   └── /reports/:reportId     Relatório publicado (leitura)  🆕
├── /whatsapp-links            Links rastreáveis + stats      ✅
├── /config                    Dados do hotel + integrações   🆕
├── /campaigns                 Campanhas (modo CONVERSÃO)     🔜
└── /site                      Site/funil (oculto s/ fonte)   🔜

── ÁREA DO SUPER ADMIN (read-write) ──────────────────────────────────
/dashboard/hotel-portal
├── (index)                    Lista de clientes              ✅
└── /:clientId                 Painel do cliente              ✅
    ├── (overview)             Visão da conta (operação)      🆕
    ├── /ota         [editar]  Inserir OTA mensal             🆕
    ├── /report      [editar]  Editar/publicar relatório      🆕
    ├── /config      [editar]  Cadastro + conectar integ.     🆕
    ├── /metrics     [editar]  KPI/reputação/paridade/budget  🔜
    ├── /campaigns             Campanhas (sync)               🔜
    ├── /site                  Site                           🔜
    ├── /reservations          Reservas (motor/manual)        🔜
    ├── /guests                Hóspedes (CRM)                 🔭
    ├── /whatsapp              Templates/envio                🔭
    └── /whatsapp-links        Criar/editar links             ✅
```

**Menu lateral (gerente) — ordem e ícones (Tabler):**
`Visão geral (ti-layout-dashboard)` · `OTA vs Direto (ti-arrows-exchange)` · `WhatsApp (ti-brand-whatsapp)` · `Relatórios (ti-file-text)` · `Configurações (ti-settings)`. Campanhas/Site só aparecem no menu **em modo CONVERSÃO** (ou como item desabilitado "em breve").

---

## 3. Hierarquia de componentes (component tree)

### 3.1 Shell global (envolve todas as telas)
```
<AppShell>
├── <Sidebar>                role-aware: itens do gerente vs admin
│   ├── <ClientBrand>        logo + nome do hotel
│   └── <NavItem[]>          ícone + label + estado ativo
├── <TopBar>
│   ├── <ClientSwitcher>     (só admin) troca de hotel
│   ├── <PeriodPicker>       from/to global — afeta toda a página
│   └── <UserMenu>
└── <PageOutlet>             conteúdo da rota
```

### 3.2 Biblioteca de componentes reutilizáveis (construir primeiro)
| Componente | Função | Usado em |
|---|---|---|
| `<MetricCard label value delta source>` | card de número + variação + selo | Overview, OTA |
| `<SourceBadge type="auto\|server\|manual">` | pill 🔌/🎯/✍️ | em todo card/tabela |
| `<DeltaIndicator value>` | seta ↑/↓ verde/vermelho + % | dentro de MetricCard |
| `<PeriodPicker>` | seletor from/to (presets: mês atual, mês passado, 90d) | TopBar |
| `<TimeseriesChart series>` | gráfico de evolução (direto/OTA/gasto) | Overview |
| `<ChannelTable rows>` | tabela por canal/campanha | OTA, Campanhas, WhatsApp |
| `<TrafficBars data>` | barras de origem (orgânico/pago/direto) | Overview/Site |
| `<IntegrationStatusCard provider status lastSync>` | conectar/desconectar/status honesto | Config |
| `<EmptyState reason>` | "em breve via motor", "sem dados no período" | qualquer card sem fonte |
| `<SkeletonCard>` / `<SkeletonTable>` | loading | carregamento |
| `<ReportViewer report>` | render do relatório publicado | Relatórios |
| `<WhatsAppLinkCard link stats>` | link + short URL + cliques | WhatsApp links |
| `<ModeGate mode="conversion">` | wrapper que só renderiza filhos no modo certo | cards de ROAS/funil |

> `<ModeGate>` é a peça central da regra de exibição. Tudo que é exclusivo de modo CONVERSÃO fica dentro dele; em modo ATIVIDADE ele não monta nada (não renderiza placeholder de ROAS).

---

## 4. Spec tela a tela (layout + estados + fonte)

Formato de cada tela: **propósito · layout (de cima pra baixo) · lógica condicional · estados · endpoint (do arquivo 02)**.

### 4.1 Overview do gerente — `/dashboard/hotel/overview` 🆕 ⭐
- **Propósito:** a tela que prova o serviço em 5 segundos.
- **Layout (topo → base):**
  1. `<PageHeader>` nome do hotel + `<PeriodPicker>`.
  2. Linha de `<MetricCard>` (4): **Visitas no site** 🔌 · **Cliques em anúncios** 🔌 · **Conversas no WhatsApp** 🔌 · **Reservas diretas** (🎯 modo CONVERSÃO / ✍️ modo ATIVIDADE).
  3. `<ModeGate mode="conversion">`: linha com **ROAS** 🎯, **Receita atribuída** 🎯, **Custo por reserva** 🎯.
  4. `<TimeseriesChart>` evolução (receita direta vs OTA vs gasto).
  5. `<TrafficBars>` origem do tráfego 🔌 + card **Investimento em mídia** 🔌 (gasto/alcance/CPC).
  6. `<ChannelTable>` WhatsApp por campanha (cliques/conversas 🔌 · fechadas ✍️).
- **Condicional:** itens 3 só existem em modo CONVERSÃO. Reserva direta troca de selo conforme modo.
- **Estados:** loading → `<SkeletonCard>×N`; período sem dado → `<EmptyState reason="sem-dados-periodo">`.
- **Endpoint:** `GET /hotel-portal/:clientId/overview?from&to`.

### 4.2 OTA vs Direto — `/dashboard/hotel/ota` 🆕
- **Propósito:** o "match" da RÉSERVE — comissão recuperada.
- **Layout:** `<MetricCard>` Receita direta ✍️ · Receita OTA ✍️ · **Comissão recuperada (R$)** ✍️ (destaque) → `<ChannelTable>` por OTA (canal/receita/comissão%/comissão R$/reservas) → mini-gráfico de pizza direto×OTA.
- **Estados:** mês sem inserção → `<EmptyState reason="aguardando-fechamento">` com CTA (só admin vê o atalho de inserir).
- **Endpoint:** `GET /clients/:id/ota-data?from&to`.

### 4.3 Relatórios — `/dashboard/hotel/reports` + `/reports/:reportId` 🆕
- **Lista:** cards por mês com `status` (published) e data. Só publicados aparecem pro gerente.
- **Detalhe (`<ReportViewer>`):** resumo executivo + highlights + snapshot do overview no fechamento + botão "baixar PDF".
- **Endpoint:** `GET /clients/:id/reports` · `GET /clients/:id/reports/:reportId`.

### 4.4 WhatsApp links — `/dashboard/hotel/whatsapp-links` ✅
- **Layout:** lista de `<WhatsAppLinkCard>` (label, short URL, total de cliques) → ao abrir um link: stats por cidade/dispositivo/dia.
- **Admin (mesma tela em `[clientId]/whatsapp-links`):** botão "criar link" + campo de "marcar fechadas" por campanha (o input ✍️ que alimenta o Overview).
- **Endpoint:** `GET /wa/:code` (redirect público) · `GET /clients/:id/whatsapp/links/:linkId/stats`.

### 4.5 Configurações — `/dashboard/hotel/config` 🆕
- **Gerente (read-only):** dados do hotel + `<IntegrationStatusCard>` por integração (só leitura do status honesto: connected / manual / not_configured).
- **Admin (`[clientId]/config`):** edita cadastro, escolhe `bookingEngine`, e **conecta integrações** (botão "Conectar" → OAuth; ou "Inserir credencial" para motor). Status nunca mente.
- **Endpoint:** `GET /clients/:id` · `GET /clients/:id/integrations` · `POST .../integrations/:provider/connect`.

### 4.6 Admin — Lista de clientes — `/dashboard/hotel-portal` ✅
- **Layout:** tabela/grid de hotéis: nome, logo, **modo** (badge CONVERSÃO/ATIVIDADE), resumo de integrações, último relatório. Busca + "novo hotel".
- **Endpoint:** `GET /clients`.

### 4.7 Admin — Painel do cliente — `/dashboard/hotel-portal/:clientId` ✅/🆕
- **Propósito:** onde a RÉSERVE opera e **insere** dado (resolve o "ficava preso").
- **Layout:** mesmo overview do gerente **+ barra de ação** "Gerenciar dados" com atalhos para as abas de inserção (OTA, Relatório, Métricas). Cada aba de inserção é um `<form>` com validação e selo ✍️.
- **Endpoint:** `POST /clients/:id/ota-data`, `POST/PATCH /reports`, `POST /metrics/:id/*`.

---

## 5. Padrões de UX transversais

### 5.1 Selo de origem (`<SourceBadge>`)
| Tipo | Rótulo | Ícone | Cor |
|---|---|---|---|
| `auto` | automático | `ti-bolt` | info (azul) |
| `server` | rastreado | `ti-shield-check` | success (verde) |
| `manual` | manual | `ti-pencil` | warning (âmbar) |

Sempre visível, pequeno (11–12px). É o que sustenta a confiança e mata as "métricas-fantasma".

### 5.2 Estados de cada card/tabela (todos obrigatórios)
- **loading** → skeleton (nunca spinner em tela cheia).
- **vazio (período sem dado)** → `<EmptyState reason="sem-dados-periodo">`.
- **fonte inexistente (modo ATIVIDADE)** → o card simplesmente **não é montado** (via `<ModeGate>`); se for um campo dentro de tela existente, `<EmptyState reason="via-motor-em-breve">`.
- **erro** → mensagem curta + "tentar de novo", sem derrubar a página inteira.

### 5.3 Formatação (centralizar num util)
- Moeda: `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})` sobre `amount/100` (API manda centavos).
- Percentual: 1 casa. Delta: seta ↑ verde / ↓ vermelho + `+8,6 p.p.` ou `+18%`.
- Datas: `pt-BR`. Período padrão: mês atual.

### 5.4 Period picker global
Um só, no `<TopBar>`. Muda `from/to` → re-fetch de toda a página. Presets: mês atual, mês passado, últimos 90 dias, custom.

### 5.5 Responsividade
Desktop-first (uso de agência), mas o **gerente abre muito no celular**. Grids de card colapsam para 1–2 colunas; tabelas viram scroll horizontal ou cards empilhados em < 600px. Nada de tabela cortada.

### 5.6 Acessibilidade mínima
Contraste AA, foco visível, labels em todos os inputs, `aria-label` em botões só-ícone, navegação por teclado nas abas.

---

## 6. Fluxos de usuário (user flows)

**A. Onboarding de hotel (super admin)** 🆕
```
Novo hotel → preenche cadastro → escolhe bookingEngine
   ├─ tem motor → "Conectar integração de reservas" (credencial/OAuth) → status: connected → MODO CONVERSÃO
   └─ não tem  → marca "manual" → MODO ATIVIDADE
→ conecta Meta/Google/GA4 (ou marca manual) → hotel pronto
```

**B. Fechamento mensal (super admin)** 🆕
```
Reunião de fechamento → insere OTA + reservas diretas (✍️) + reputação
→ Overview recalcula → cria/edita relatório (draft → review)
→ publica → notifica o gerente
```

**C. Gerente visualiza** 🆕
```
Login → Overview (5s de prova) → abre relatório do mês → vê stats de WhatsApp
```

---

## 7. Diretrizes visuais (brand RÉSERVE)

Referência viva: o mockup do modo ATIVIDADE já aprovado nesta conversa. Princípios:
- **Flat e limpo.** Superfícies brancas, bordas 0.5px, sem sombra/gradiente. Whitespace generoso.
- **Hierarquia:** número grande (24px/500) + label pequeno (13px, secundário) + selo (11px).
- **Cor com significado:** azul = automático/info; verde = rastreado/sucesso; âmbar = manual; vermelho só erro. Não usar cor decorativa.
- **Sentence case** em tudo. Sem ALL CAPS, sem Title Case.
- **Tom de marca:** sóbrio e confiável (é prova de resultado pra um hoteleiro que já se queimou com agência), não "startup colorida".
- Logo do hotel sempre presente no shell — é o portal *dele*, com selo RÉSERVE.

---

## 8. Mapa tela → endpoint (a cola da sincronia back↔front)

Cada tela consome **exatamente** o(s) endpoint(s) abaixo. Front não inventa agregação. Mudou o contrato (arquivo 02) → muda a tela no mesmo PR.

| Tela | Endpoint(s) (arquivo 02) |
|---|---|
| Overview | `GET /hotel-portal/:clientId/overview` |
| OTA vs Direto | `GET /clients/:id/ota-data` · (admin) `POST /clients/:id/ota-data` |
| Relatórios | `GET /clients/:id/reports` · `GET .../reports/:reportId` · (admin) `POST/PATCH/publish` |
| WhatsApp links | `GET /clients/:id/whatsapp/links/:linkId/stats` · `POST /clients/:id/whatsapp/links` |
| Config / integrações | `GET /clients/:id` · `GET /clients/:id/integrations` · `POST .../connect` · `POST .../sync` |
| Lista de clientes | `GET /clients` |
| Painel do cliente | overview + endpoints de inserção (`POST` OTA/KPI/report) |
| Campanhas (🔜) | `GET /hotel-portal/:clientId/campaigns` |
| Site (🔜) | `GET /hotel-portal/:clientId/site-metrics` |

---

## 9. Checklist de implementação (front, ordem sugerida)

1. [ ] `<AppShell>` + `<Sidebar>` role-aware + `<PeriodPicker>` global.
2. [ ] Biblioteca base: `<MetricCard>`, `<SourceBadge>`, `<DeltaIndicator>`, `<EmptyState>`, `<SkeletonCard>`, `<ModeGate>`.
3. [ ] Tela **Overview** consumindo `/overview` (modo ATIVIDADE primeiro — é o que vale pra maioria).
4. [ ] `<ChannelTable>` + tela **OTA vs Direto**.
5. [ ] **Config** com `<IntegrationStatusCard>` honesto + ponte admin "Gerenciar dados".
6. [ ] **Relatórios** + `<ReportViewer>`.
7. [ ] **WhatsApp links** (reaproveitar o que já existe).
8. [ ] Ligar `<ModeGate>` aos cards de modo CONVERSÃO (Fase 2, quando o motor entrar).
9. [ ] Gerar client tipado a partir do OpenAPI do backend (sincronia automática).
