# RÉSERVE — Plano de Produto do Dashboard de Hotelaria
### Do MVP à Escala — documento de direção para o time de implementação

> **Para quem é este documento:** agentes/devs que vão implementar.
> **O que ele resolve:** parar de "implementar muito e usar pouco". Define o que construir, em que ordem, com qual rota, e por quê.
> **Documento irmão:** `02_CONTRATO_API_HOTEL_PORTAL.md` (contrato de rotas back↔front).

---

## 0. TL;DR (leia isto se ler só uma coisa)

1. **O produto só precisa provar uma frase:** *"a RÉSERVE traz mais reserva direta e devolve comissão de OTA — e aqui está a prova rastreável."* Tudo que não serve a essa frase sai do MVP.
2. **A peça crítica que falta NÃO é mais um pixel.** É **rastreamento server-side de conversão** (Meta Conversions API + Google Enhanced Conversions), alimentado pela **reserva confirmada**. Isso é o diferencial real e resolve as "métricas-fantasma" de checkout que hoje não dá pra rastrear.
3. **O motor de reservas é a fonte da verdade da conversão** — mas é opcional por cliente. Arquitetura: *adapter por motor + webhook quando existe + polling quando não + manual quando nada disso existe.*
4. **O backend tem modelo demais e automação de menos.** O maior destravador é uma **camada de agregação** (endpoint `/overview` que devolve KPI calculado, não lista crua).
5. **Recorte do MVP:** Direto vs OTA + comissão recuperada → Relatório mensal → Overview consolidado → Config/cadastro. O resto vira "Fase 2 / em breve".

---

## 1. Diagnóstico — por que você se sente perdido

Você não está perdido por falta de capacidade técnica. Está perdido por um problema clássico de produto: **o backend cresceu por entidade, não por jornada de uso.** Hoje existem 11 abas, ~9 domínios e dezenas de modelos — mas nenhum fluxo end-to-end que alguém usaria de segunda a sexta.

Os sintomas que você descreveu mapeiam para causas concretas:

| Sintoma que você sente | Causa real | Onde se resolve |
|---|---|---|
| "Muita implementação, pouca utilização" | Escopo largo demais; nada está "pronto de ponta a ponta" | Recorte do MVP (Seção 3) |
| "Não sei se vai ser usado / se é o certo" | Não há uma tela que entrega a proposta de valor sozinha | Tese do produto (Seção 2) + Overview (Seção 7) |
| "Métricas-fantasma" (checkout_starts/completes) | Você tentou rastrear no GA4 algo que vive no motor de reservas | Arquitetura de rastreamento (Seção 5) |
| "Fico preso, não acho a funcionalidade" | Falta a ponte super admin → rota de inserção | Roadmap Fase 0 (Seção 8) |
| "Não há UI pra conectar integração" | Tokens existem no banco, mas sem fluxo de conexão | Integrações (Seção 5.4) + rotas (Seção 9) |

**Princípio que vamos seguir:** construir por **jornada**, não por entidade. Uma jornada inteira que funciona vale mais que dez entidades pela metade.

---

## 2. A tese do produto

A RÉSERVE é uma agência de marketing hoteleiro. O dashboard **não é** um BI genérico de hotel — é a **prova de serviço** da RÉSERVE para o cliente (hotel/pousada) e a **ferramenta de operação** da própria RÉSERVE.

O mercado de marketing hoteleiro brasileiro converge em torno de uma promessa única: **aumentar reserva direta para reduzir dependência e comissão de OTA.** É o que Reprotel, Tribuzana, Elevatto, HotelariaWeb e Hotel Ads vendem — tráfego pago (Meta/Google), site que converte, e "reduzir comissão de intermediário". Onde elas variam é em **maturidade de mensuração e transparência**.

> **A oportunidade da RÉSERVE não é fazer o mesmo melhor. É medir melhor e mostrar de forma rastreável.**
> A maioria das agências entrega print de Gerenciador de Anúncios + relatório em PDF. Quem entrega um **portal vivo, com atribuição server-side e comissão recuperada em R$**, joga em outro nível de confiança.

Duas personas, dois objetivos (já existe na sua estrutura — manter):

| Persona | Objetivo | Rota | Natureza |
|---|---|---|---|
| **Gerente do hotel** (cliente) | "Provem que vale o que pago" | `/dashboard/hotel/*` | Read-only — portal de resultados |
| **Super admin (RÉSERVE)** | Operar contas e inserir/conectar dados | `/dashboard/hotel-portal/[clientId]` | Read-write — painel de operação |

---

## 2.5 Os dois cenários de cliente (resolve a ambiguidade)

A dashboard é **um único produto**. Ela não muda de versão por cliente — ela **se adapta sozinha** lendo dois campos: `bookingEngine` do hotel e o `status` das integrações. O front renderiza condicionalmente a partir disso. Isso resolve o "se tiver motor conecta, se não tiver faz o outro".

| | **Cenário A — cliente COM motor de reservas** | **Cenário B — cliente SEM motor** |
|---|---|---|
| Reserva direta | 🎯 **automática** (webhook/polling do motor) | ✍️ **manual** (número do fechamento mensal) |
| Atribuição / ROAS | 🎯 **real, server-side** (CAPI + Enhanced Conversions) | ❌ **não exibe ROAS** — exibe leads e atividade |
| Funil de checkout | 🎯 exibe (vem do motor) | 🚫 oculto / "via motor de reservas — em breve" |
| Site (visitas/origem) | 🔌 automático (GA4) | 🔌 automático (GA4) |
| Tráfego pago (gasto/cliques) | 🔌 automático (Meta/Google) | 🔌 automático (Meta/Google) |
| WhatsApp (cliques/conversas) | 🔌 automático (links) | 🔌 automático (links) |
| Reservas via WhatsApp | ✍️ "fechadas" marcadas por campanha | ✍️ "fechadas" marcadas por campanha |
| Promessa da tela | "geramos R$ X de reserva atribuída" | "trouxemos X visitas, Y conversas, Z reservas (informadas)" |

**Regra de renderização (o front segue isto):**

```
SE client.bookingEngine != "none" E integração de reserva = conectada:
    → modo CONVERSÃO  (cards de ROAS, receita atribuída, funil visíveis)
SENÃO:
    → modo ATIVIDADE  (cards de leads/atividade; ROAS e funil OCULTOS;
                       reservas diretas entram como input manual ✍️)
```

> Nunca renderizar um card de ROAS/receita atribuída em modo ATIVIDADE. Em vez de mostrar zero ou número inventado, o card **não existe** naquele cenário. A tela é honesta por construção.

> **Antes de construir qualquer um dos dois:** validar a versão leve (modo ATIVIDADE) com ferramenta de prateleira (Looker Studio + planilha). Só partir para o dev custom depois que o cliente demonstrar que usa o portal. O arquivo `03_ESTRUTURA_UX_E_ARVORE.md` é o spec de construção para quando esse momento chegar.

---

## 3. Recorte do MVP

Critério de corte: **entra no MVP só o que prova a tese sem depender de integração que ainda não existe.**

### 3.1 Núcleo do MVP (construir agora)

| # | Capacidade | Por quê | Fonte do dado |
|---|---|---|---|
| 1 | **Direto vs OTA + comissão recuperada (R$)** | É o "match" da RÉSERVE. Sozinho já justifica o contrato | Manual mensal (+ webhook quando houver motor) |
| 2 | **Relatório mensal** (draft→review→publish) | É o entregável que o cliente recebe e lê | Manual + agregado |
| 3 | **Overview consolidado** | A primeira tela; consolida 1 e 2 em KPI calculado | Agregação no backend |
| 4 | **Config + cadastro de hotel + status de integração** | Onde o super admin opera e o gerente vê o que está ligado | Manual / status |
| 5 | **Links de WhatsApp rastreáveis** | Já funciona e é diferencial barato. Manter visível | Automático (já existe) |

### 3.2 Fase 2 (depois que o núcleo for usado de verdade)

- **Campanhas (Meta/Google Ads)** com sync automático — só quando a UI de conexão existir.
- **Site (GA4 + Pixel + CAPI)** com a camada server-side (Seção 5).
- **Métricas avançadas:** RevPAR, ADR, ocupação, booking window, paridade de tarifa.

### 3.3 Fase 3 (maturidade)

- CRM de hóspedes + reativação.
- WhatsApp templates + envio (pré-chegada, pós-estadia, upsell).
- Metasearch / Google Hotel Ads.
- Monitoramento de reputação automatizado.

### 3.4 O que sai/conserta antes de escalar (dívida que trava tudo)

1. **Tirar as métricas-fantasma do Site** (checkout_starts/completes/conversion_rate) da tela enquanto não houver fonte real → marcar como "via motor de reservas (em breve)" ou esconder.
2. **Criar a ponte super admin → rota de inserção** (botão "Gerenciar dados" em cada cliente).
3. **Decidir o destino das integrações:** ou constrói UI de conexão (OAuth), ou assume explicitamente "dado manual" e remove a promessa de sync. Nada de status mentindo "conectado".
4. **Blindar agregações contra `undefined`** (o crash de `totals` que vocês já pegaram é sintoma — toda agregação retorna zero-safe).

---

## 4. Arquitetura de dados — as 3 formas de o dado entrar

O ponto que mais confunde a UX hoje é misturar fontes. Separe explicitamente, **inclusive na tela** (cada card mostra um selo de origem):

```
                         ┌─────────────────────────────────────────────┐
                         │              HotelClient (1 hotel)            │
                         └─────────────────────────────────────────────┘
                                          ▲   ▲   ▲
        ┌─────────────────────────────────┘   │   └─────────────────────────────┐
        │                                      │                                 │
🔌 AUTOMÁTICO (sync)              🎯 SERVER-SIDE (conversão)            ✍️ MANUAL (mensal)
  Meta Ads / Google Ads / GA4       Reserva confirmada →                 OTA, RevPAR/ADR,
  → CampaignMetric, SiteMetric      Meta CAPI + Google Enh. Conv.        reputação, paridade,
  (cron periódico)                  (webhook do motor OU pixel purchase)  budget, reservas, guests
```

| Camada | O que entra | Como | Estado hoje |
|---|---|---|---|
| 🔌 **Automático** | Gasto, ROAS, CPL, tráfego, sessões | Cron `@nestjs/schedule` puxando API de Meta/Google/GA4 | Tokens existem, **sync não implementado** |
| 🎯 **Server-side** | **Conversão real / valor da reserva** | Webhook do motor de reservas → grava reserva **e** dispara CAPI/Enhanced Conv. | **Inexistente — é o gap crítico** |
| ✍️ **Manual** | OTA, KPI hoteleiro, reputação, paridade, budget | Formulário na rota admin `[clientId]` | **Funciona** |

> **Regra de ouro:** todo número na tela tem que ter uma origem rastreável e um selo (🔌/🎯/✍️). Número sem origem é o que gerou suas "métricas-fantasma".

---

## 5. Rastreamento — o que você tem, o que falta, o que é crítico

Você perguntou "existe mais meio de rastreamento que eu não estou vendo?". Sim. Hoje você está no nível "client-side" (pixel + GA4), que é o **mais frágil** (iOS, bloqueador de anúncio, consentimento de cookie destroem 20–40% dos eventos). O salto de qualidade está no server-side.

### 5.1 O que você já tem / já planejou
- **GA4** — analytics de comportamento do site. É **medição**, não atribuição de conversão.
- **Meta Pixel** — eventos client-side. Bom para coletar, ruim sozinho para atribuir.
- **Meta Ads / tráfego pago** — canal principal de hotelaria no Brasil.
- **Links de WhatsApp rastreáveis** — ótimo, mantém. É um diferencial barato.

### 5.2 O que FALTA e é CRÍTICO (o diferencial)

| Método | O que é | Por que é crítico para hotel | Esforço |
|---|---|---|---|
| **Meta Conversions API (CAPI)** | Evento de conversão enviado **servidor→servidor**, com e-mail/telefone com hash | Não depende do browser; a reserva direta te dá e-mail/telefone reais → *match quality* alto → algoritmo do Meta otimiza pra reserva, não pra clique | Médio |
| **Google Ads Enhanced Conversions** | Equivalente do Google; conversão server-side com dado first-party | Mesmo motivo, no Google Ads/Hotel Ads | Médio |
| **Deduplicação por `event_id`** | Pixel (client) e CAPI (server) mandam o mesmo `event_id` → conta como 1 conversão | Evita contar reserva 2x; é o que faz o conjunto ser confiável | Baixo (junto com os de cima) |
| **Padrão de UTM único** | Toda URL (Meta, Google, WhatsApp, e-mail) com UTM padronizado | Sem isso, atribuição entre canais não fecha | Baixo (processo) |

> **A frase de venda que isso te dá:** *"a gente não mede o clique no botão; a gente mede a reserva confirmada — server-side, atribuída ao canal certo, num número que nenhum ajuste de navegador apaga."* Isso é o que separa a RÉSERVE de quem só manda print do Gerenciador.

### 5.3 Motor de reservas — a fonte da verdade (opcional por cliente)

A reserva confirmada é o evento de "compra". A melhor origem dela é o **motor de reservas**. Mas — como você levantou — **varia por cliente**: nem todo hotel tem motor, e nem todo motor expõe webhook. Por isso a arquitetura é em camadas de fallback:

```
1ª opção  → Webhook do motor (push)      ┐
2ª opção  → Polling da API do motor      ├─→ normaliza p/ HotelReservation ─→ dispara CAPI/Enh.Conv.
3ª opção  → Pixel "purchase" no site     │
4ª opção  → Inserção manual (mensal)     ┘
```

**Padrão de implementação: um adapter por motor** (interface `BookingEngineAdapter`), selecionado pelo campo `booking_engine` do `HotelClient`. O webhook genérico (`booking-webhook.controller`, que já existe) recebe, identifica o motor pela credencial/segredo, normaliza e grava.

Levantamento dos motores que você citou (confirmar credencial caso a caso — todos exigem ativação/cadastro junto ao fornecedor):

| Motor | API? | Webhook de reserva? | Observação para integração |
|---|---|---|---|
| **Omnibees** | Sim (SOAP `OTA2014b` pull + API REST nova) | Parcial / via parceiro | Credenciais por hotel liberadas pelo account manager; integração two-way com PMS. Começa com **pull/polling**. |
| **Stays.net** | Sim (Open API REST `external/v1`, OAuth) | **Sim** — dispara na criação de reserva | Requer habilitar "External API" (add-on pago). Melhor candidato para webhook nativo. |
| **HITS / HSystem** | Varia por versão | Geralmente não nativo | Provável **polling** ou manual. Validar com o cliente. |
| **Foco / FocoRadar** | Varia | Geralmente não | Provável manual/polling. |
| **TOTVS (CMNet/Hits)** | API corporativa | Não voltado a marketing | Integração pesada; tratar como Fase 3 ou manual. |
| **Webhook genérico** | — | Sim (você define) | Para motores próprios/custom e testes. Já previsto no backend. |

> **Decisão de produto:** no cadastro do hotel, `booking_engine` define o adapter; se o motor não suportar push, o sistema cai pra polling; se não tiver API, cai pra manual — **e a tela diz qual modo está ativo.** Nunca prometer sync que não roda.

### 5.4 Conectar integrações — a UI que falta

Hoje só dá pra colocar credencial no banco. Falta o fluxo:
- **OAuth** para Meta Ads, Google Ads, GA4 (fluxo "Conectar conta" → callback → token criptografado em `HotelApiCredential` → status `connected`).
- **Credencial manual** (API key / client_id+secret) para motores de reserva.
- **Tela de status honesta:** `connected` / `needs_reauth` / `error` / `manual` / `not_configured`, com data do último sync.

### 5.5 Métodos adicionais que valem a pena (Fase 2/3)
- **Google Tag Manager server-side** — centraliza o disparo de eventos para Meta+Google de um lugar só.
- **Call tracking / rastreio de telefone** — número rastreável por campanha (hotelaria ainda fecha muito por telefone).
- **Metasearch / Google Hotel Ads** — canal forte de reserva direta; Reprotel inclusive se posiciona como certificada Google Hotel Ads. Gap que a RÉSERVE pode ocupar.
- **Reputação automatizada** — hoje manual; APIs/coletas de Google/TripAdvisor/Booking depois.

---

## 6. Benchmark — o que as outras agências entregam (e onde você ganha)

Resumo do que o mercado brasileiro oferece, a partir das principais agências do setor:

| Capacidade | Mercado (Reprotel, Tribuzana, Elevatto, HotelariaWeb, Hotel Ads) | RÉSERVE hoje | Oportunidade |
|---|---|---|---|
| Tráfego pago Meta/Google | ✅ padrão | ✅ | Paridade |
| Site que converte / SEO | ✅ padrão | (fora de escopo aqui) | — |
| GA4 / mensuração client-side | ✅ comum | ✅ | Paridade |
| **Atribuição server-side (CAPI/Enh.Conv.)** | ⚠️ raro / mal-feito | ❌ | **🏆 Diferencial forte** |
| **Comissão de OTA recuperada em R$** | parcial (discurso) | ✅ modelado | **🏆 Tornar o herói do dashboard** |
| **Portal de cliente vivo (read-only)** | maioria entrega PDF/print | ✅ existe | **🏆 Diferencial** |
| **Links WhatsApp rastreáveis** | raro | ✅ | **🏆 Diferencial barato** |
| Revenue Management (RevPAR/ADR) | Elevatto oferece | modelado (manual) | Fase 2, vira diferencial |
| Google Hotel Ads / Metasearch | Reprotel certificada | ❌ | Fase 3, gap a ocupar |
| Relatório mensal | ✅ (geralmente manual/PDF) | ✅ workflow | Automatizar = ganho de margem |

**Leitura:** o mercado vende *execução* de tráfego. Poucos vendem *mensuração confiável e transparência*. O ativo que você já tem (portal vivo + comissão recuperada + WhatsApp rastreável) + o que falta (server-side) = um posicionamento de "agência que prova com dado rastreável", que é exatamente a dor de quem já se queimou com agência que "some o número".

---

## 7. KPIs que o dashboard deve calcular (camada de agregação)

Hoje `getFullDashboard` devolve listas cruas. O MVP precisa de um endpoint `/overview` que devolve **KPI já calculado** (zero-safe). Estes são os números que importam — separados em "operação do hotel" e "prova de marketing":

### 7.1 Prova de marketing (o que a RÉSERVE entrega) — prioridade máxima
- **% Reserva direta vs OTA** (receita e nº de reservas)
- **Comissão de OTA recuperada (R$)** = receita direta × comissão média evitada
- **ROAS consolidado** e por canal (gasto → receita atribuída server-side)
- **CPA / Custo por reserva** (Marketing Cost Per Booking)
- **Receita direta no período** + evolução mês a mês
- **Cliques/conversas via WhatsApp** (já rastreável)
- **Funil do site** (sessões → consideração → reserva) — *só com fonte real*

### 7.2 Contexto hoteleiro (Fase 2) — RevPAR/ADR/Ocupação
- **RevPAR** = ADR × Ocupação (ou receita de quartos ÷ quartos disponíveis)
- **ADR** (diária média), **Ocupação %**
- **Booking window** (antecedência média da reserva)
- **Paridade de tarifa** (direto vs OTA)
- **Reputação** (nota + volume Google/TripAdvisor/Booking)

> Todo KPI agregado deve aceitar `from`/`to`, retornar `value`, `previous` (período anterior) e `delta` — é o que faz o dashboard "contar uma história" em vez de mostrar número solto.

---

## 8. Roadmap em fases

### Fase 0 — Saneamento (1 sprint) · *destrava sem construir feature nova*
- [ ] Esconder/rotular métricas-fantasma do Site.
- [ ] Botão "Gerenciar dados" (ponte super admin → rota de inserção).
- [ ] Status de integração honesto (`manual`/`not_configured`/`connected`).
- [ ] Agregações zero-safe (fim do crash de `totals`).

### Fase 1 — MVP (2–3 sprints) · *a tese fica de pé*
- [ ] Endpoint **`GET /hotel-portal/:clientId/overview?from&to`** (KPI calculado).
- [ ] Tela **Overview** (cards: direto vs OTA, comissão recuperada, ROAS, receita; + gráfico de evolução).
- [ ] **OTA vs Direto** (entrada manual + visualização).
- [ ] **Relatório mensal** ponta a ponta (draft→review→publish→notifica cliente).
- [ ] **Config/cadastro** + **WhatsApp links** já no menu.

### Fase 2 — Automação de aquisição (3–5 sprints) · *o diferencial entra*
- [ ] **UI de conexão (OAuth)** Meta Ads / Google Ads / GA4.
- [ ] **Sync automático** (cron) populando CampaignMetric/SiteMetric.
- [ ] **Server-side: Meta CAPI + Google Enhanced Conversions** com dedup por `event_id`.
- [ ] **Webhook do motor de reservas** (adapter Stays primeiro; polling Omnibees).
- [ ] Métricas avançadas (RevPAR/ADR/ocupação/booking window/paridade).

### Fase 3 — Maturidade · *vira plataforma*
- [ ] CRM de hóspedes + reativação · WhatsApp templates/envio.
- [ ] Metasearch / Google Hotel Ads.
- [ ] Reputação automatizada · GTM server-side · call tracking.

**Ordem de dependência (resumo):** Agregação → Overview → (em paralelo) Relatório → UI de conexão → Sync → Server-side → Motores → Avançado.

---

## 9. Mapa de rotas — Backend

> Detalhe completo (params, body, response) em `02_CONTRATO_API_HOTEL_PORTAL.md`.
> Base: `/api/v1`. Tudo escopado por `HotelClient` e por tenant. Auth JWT (admin vs user).

### 9.1 Já existem (manter / reaproveitar)
```
GET    /hotel-portal/:clientId/dashboard            DashboardSnapshot (cru)
GET    /hotel-portal/:clientId/campaigns            CampaignMetric[]
GET    /hotel-portal/:clientId/site-metrics         SiteMetric[]
GET    /clients/:id/ota-data                        OtaMonthlyData
GET    /metrics/:id/kpi                              HotelMonthlyKpi
GET    /metrics/:id/reputation                       HotelReputationMetric
GET    /metrics/:id/booking-window                   BookingWindowMetric
GET    /metrics/:id/rate-parity                      RateParityCheck
GET    /metrics/:id/budget                           MarketingBudget
GET    /guests/:clientId/reactivation                HotelGuest[] (reativação)
GET    /wa/:code                                     redirect + registra clique
POST   /webhooks/booking/:clientId                   recebe reserva do motor
```

### 9.2 Novas — MVP (Fase 1)
```
GET    /hotel-portal/:clientId/overview?from&to      ⭐ KPI consolidado calculado
POST   /clients                                       cria hotel (admin)
PATCH  /clients/:id                                   edita hotel/metas/motor
GET    /clients/:id                                   detalhe do hotel + status integrações
POST   /clients/:id/ota-data                          inserção manual OTA (admin)
POST   /metrics/:id/kpi                               inserção manual KPI (admin)
POST   /reports / PATCH /reports/:id / POST /reports/:id/publish   relatório mensal
```

### 9.3 Novas — Fase 2 (integrações + server-side)
```
GET    /clients/:id/integrations                      status de todas as conexões
POST   /clients/:id/integrations/:provider/connect    inicia OAuth (meta_ads|google_ads|ga4)
GET    /integrations/:provider/callback               callback OAuth → grava credencial
POST   /clients/:id/integrations/:provider/sync       dispara sync manual (além do cron)
DELETE /clients/:id/integrations/:provider            desconecta
POST   /clients/:id/conversions                       evento de conversão → CAPI + Enh.Conv. (interno)
```

---

## 10. Mapa de rotas — Frontend

### 10.1 Lado gerente (read-only) — `/dashboard/hotel/*`
```
/dashboard/hotel/overview          ⭐ NOVA — tela herói (MVP)
/dashboard/hotel/ota               OTA vs Direto + comissão recuperada
/dashboard/hotel/reports           Relatórios mensais publicados
/dashboard/hotel/whatsapp-links    Links rastreáveis
/dashboard/hotel/config            Dados do hotel + status de integração
/dashboard/hotel/campaigns         (Fase 2) Campanhas
/dashboard/hotel/site              (Fase 2) Site/funil — escondido até ter fonte real
```

### 10.2 Lado admin (read-write) — `/dashboard/hotel-portal/[clientId]`
```
/dashboard/hotel-portal                       Lista de clientes
/dashboard/hotel-portal/[clientId]            Overview do cliente (operação)
/dashboard/hotel-portal/[clientId]/ota        Inserir OTA (MVP)
/dashboard/hotel-portal/[clientId]/report     Editar/publicar relatório (MVP)
/dashboard/hotel-portal/[clientId]/config     Cadastro + conectar integrações (MVP)
  + abas Fase 2/3: campanhas, site, métricas, reservas, hóspedes, whatsapp, links-wa
```

> **Regra de sincronia:** cada tela do front consome **exatamente** um recurso do contrato (Seção do arquivo 02). Front nunca "monta" KPI — quem agrega é o backend (`/overview`). Isso é o que mantém os dois lados assíncronos sem divergir.

---

## 11. Como manter Backend e Frontend em sincronia

O problema de "back e front desencontrados" se resolve com **contrato como fonte única de verdade** + processo:

1. **Contrato versionado** (`02_CONTRATO_API_HOTEL_PORTAL.md`) é a única definição válida de request/response. Mudou contrato → muda os dois lados no mesmo PR.
2. **Tipos compartilhados:** gere tipos TypeScript a partir do contrato (DTOs do Nest → `openapi`/`zod` → tipos no front). Idealmente o backend expõe **OpenAPI/Swagger** (`@nestjs/swagger`) e o front gera client tipado.
3. **Contrato primeiro, mock depois:** o front pode começar contra um **mock** que devolve o JSON de exemplo do contrato, em paralelo ao backend real. Quando o real sobe, troca a base URL.
4. **Versão na rota** (`/api/v1`) — mudança quebrante vira `/v2`, nunca quebra o front em produção.
5. **Selo de origem no payload:** todo KPI agregado carrega `source: "auto"|"server"|"manual"` — o front renderiza o selo 🔌/🎯/✍️ a partir do dado, sem regra hardcoded.

---

## 12. Riscos e decisões em aberto (resolver com o time)

| Tema | Decisão necessária |
|---|---|
| Motores de reserva | Lista oficial de motores suportados no MVP (sugiro começar **só Stays via webhook + manual**; Omnibees polling na Fase 2). |
| Comissão recuperada | Definir a fórmula oficial (% médio por OTA por cliente? valor fixo?) e de onde vem o input. |
| Atribuição | Janela de atribuição (7d clique / 1d view?) e modelo (last-click no MVP). |
| LGPD | Hash de e-mail/telefone antes de enviar a Meta/Google; consentimento de cookie; retenção. |
| Custo de add-ons | Stays External API é pago; quem paga (RÉSERVE ou hotel)? Entra na precificação. |
| Multi-tenant | Confirmar isolamento por tenant em **todas** as novas rotas agregadas. |

---

## 13. Próximos passos imediatos (para os agentes)

1. **Ler os dois arquivos** (este + contrato de API).
2. **Fechar a Fase 0** (saneamento) — não construir feature nova até o painel parar de "mentir".
3. **Implementar `/overview`** com KPI zero-safe + montar a tela Overview do gerente.
4. **Subir Swagger/OpenAPI** no backend e gerar client tipado no front (sincronia).
5. **Validar com 1 hotel real** antes de automatizar qualquer coisa. Se ninguém usa o Overview manual, automação não resolve.

---

### Fontes de mercado consultadas (jun/2026)
Levantamento com agências brasileiras de marketing hoteleiro (Reprotel, Tribuzana, Elevatto, HotelariaWeb, Hotel Ads), documentação de motores de reserva (Omnibees, Stays.net), e material técnico sobre rastreamento server-side (Meta Conversions API, Google Enhanced Conversions) e KPIs de hospitalidade. Detalhes de cada integração devem ser confirmados caso a caso com o fornecedor, pois exigem credenciais e ativação específicas por hotel.
