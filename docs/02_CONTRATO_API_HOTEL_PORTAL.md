# RÉSERVE — Contrato de API · Hotel Portal (v1)
### Fonte única de verdade para Backend ↔ Frontend

> **Como usar:** este arquivo define request/response de cada rota. Mudou aqui → muda nos dois lados no mesmo PR.
> **Documento irmão:** `01_PLANO_PRODUTO_DASHBOARD_HOTELARIA.md` (estratégia e roadmap).
> **Status das rotas:** ✅ existe · 🆕 MVP (Fase 1) · 🔜 Fase 2 · 🔭 Fase 3.

---

## 0. Convenções globais

| Item | Regra |
|---|---|
| **Base URL** | `https://api.reserve.app/api/v1` |
| **Auth** | `Authorization: Bearer <JWT>`. Papéis: `super_admin`, `admin` (RÉSERVE) e `user` (gerente do hotel). |
| **Multi-tenant** | Toda rota é escopada por tenant via JWT; `clientId` no path identifica o hotel. Backend valida que o token tem acesso àquele cliente. |
| **Datas** | ISO-8601 (`2026-06-01`, `2026-06-01T13:45:00Z`). Períodos: `from`/`to` (inclusive). |
| **Dinheiro** | Número em **centavos** (inteiro) + `currency` (`BRL`). Ex.: `R$ 1.250,00` → `{ "amount": 125000, "currency": "BRL" }`. Evita erro de float. |
| **Origem do dado** | Todo KPI/registro agregado carrega `source`: `"auto"` 🔌 \| `"server"` 🎯 \| `"manual"` ✍️. |
| **Paginação** | `?page=1&pageSize=20` → resposta com `{ data, page, pageSize, total }`. |
| **Ordenação** | `?sort=field&order=asc|desc`. |
| **Versionamento** | Mudança quebrante → `/api/v2`. `v1` nunca quebra em produção. |

### Envelope de erro (padrão único)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "target_direct_pct deve estar entre 0 e 100",
    "field": "target_direct_pct",
    "requestId": "req_a1b2c3"
  }
}
```
Códigos: `UNAUTHORIZED` (401) · `FORBIDDEN` (403) · `NOT_FOUND` (404) · `VALIDATION_ERROR` (422) · `INTEGRATION_ERROR` (502) · `INTERNAL` (500).

### Tipos reutilizados
```ts
type Money    = { amount: number; currency: "BRL" };     // amount em centavos
type Source   = "auto" | "server" | "manual";
type Metric   = { value: number; previous: number | null; delta: number | null; source: Source };
type Period   = { from: string; to: string };            // ISO date
```

---

## 1. Auth — ✅

### POST `/auth/login`
**Acesso:** público.
```jsonc
// Request
{ "email": "ops@reserve.app", "password": "•••••" }
// Response 200
{ "token": "eyJ...", "role": "super_admin", "expiresAt": "2026-06-06T13:45:00Z",
  "user": { "id": "usr_1", "name": "Operação RÉSERVE" } }
```

### GET `/auth/me` — ✅
Retorna o usuário do token e a lista de `clientId` acessíveis.
```jsonc
// Response 200
{ "id": "usr_1", "role": "user", "clientIds": ["cli_abc"] }
```

---

## 2. Hotel Clients — ✅/🆕

### GET `/clients` — ✅ (admin)
Lista de hotéis da agência. Suporta paginação.
```jsonc
// Response 200
{ "data": [
    { "id": "cli_abc", "name": "Pousada Serra Azul", "country": "BR",
      "bookingEngine": "stays", "logoUrl": "https://...",
      "targets": { "occupancy": 75, "directPct": 60 },
      "integrationsSummary": { "metaAds": "connected", "ga4": "manual", "bookingEngine": "webhook" } }
  ], "page": 1, "pageSize": 20, "total": 1 }
```

### GET `/clients/:id` — 🆕 (admin + gerente do próprio hotel)
Detalhe do hotel + status de integrações.
```jsonc
// Response 200
{
  "id": "cli_abc",
  "name": "Pousada Serra Azul",
  "country": "BR",
  "logoUrl": "https://...",
  "bookingEngine": "stays",            // stays | omnibees | hits | foco | totvs | webhook | none
  "targets": { "occupancy": 75, "directPct": 60 },
  "integrations": [
    { "provider": "meta_ads", "status": "connected",  "lastSyncAt": "2026-06-05T03:00:00Z" },
    { "provider": "google_ads", "status": "not_configured", "lastSyncAt": null },
    { "provider": "ga4",        "status": "manual",    "lastSyncAt": null },
    { "provider": "booking_engine", "status": "webhook", "lastSyncAt": "2026-06-05T11:20:00Z" }
  ]
}
```

### POST `/clients` — 🆕 (admin)
```jsonc
// Request
{ "name": "Pousada Serra Azul", "country": "BR", "bookingEngine": "stays",
  "targets": { "occupancy": 75, "directPct": 60 } }
// Response 201 → mesmo shape de GET /clients/:id
```

### PATCH `/clients/:id` — 🆕 (admin)
Edita dados, metas e motor de reservas (campos parciais).
```jsonc
// Request
{ "targets": { "directPct": 65 }, "bookingEngine": "omnibees" }
// Response 200 → shape de GET /clients/:id
```

---

## 3. Overview consolidado — 🆕 ⭐ (a rota que destrava o MVP)

### GET `/hotel-portal/:clientId/overview?from&to`
**Acesso:** admin + gerente. Devolve **KPI já calculado** (zero-safe), não lista crua.
```jsonc
// Response 200
{
  "period": { "from": "2026-05-01", "to": "2026-05-31" },
  "comparedTo": { "from": "2026-04-01", "to": "2026-04-30" },

  "directVsOta": {
    "directRevenue":  { "value": 8500000, "currency": "BRL" },   // R$ 85.000,00
    "otaRevenue":     { "value": 3200000, "currency": "BRL" },
    "directPct":      { "value": 72.6, "previous": 64.0, "delta": 8.6, "source": "manual" },
    "commissionRecovered": { "value": 1530000, "currency": "BRL", "source": "manual" } // R$ 15.300,00
  },

  "media": {
    "spend":  { "value": 1200000, "currency": "BRL" },           // R$ 12.000,00
    "roas":   { "value": 7.08, "previous": 5.9, "delta": 1.18, "source": "server" },
    "costPerBooking": { "value": 4200, "currency": "BRL", "source": "server" }, // R$ 42,00
    "byChannel": [
      { "channel": "meta_ads",   "spend": 800000, "attributedRevenue": 6000000, "roas": 7.5, "source": "server" },
      { "channel": "google_ads", "spend": 400000, "attributedRevenue": 2500000, "roas": 6.25, "source": "server" }
    ]
  },

  "hotelKpis": {                                                 // null no MVP se ainda manual/ausente
    "revpar": { "value": 18900, "currency": "BRL", "source": "manual" },
    "adr":    { "value": 27000, "currency": "BRL", "source": "manual" },
    "occupancy": { "value": 70.0, "previous": 66.0, "delta": 4.0, "source": "manual" }
  },

  "whatsapp": { "clicks": { "value": 412, "previous": 350, "delta": 62, "source": "auto" } },

  "timeseries": [                                                // para o gráfico de evolução
    { "date": "2026-05-01", "directRevenue": 280000, "otaRevenue": 110000, "spend": 40000 }
    /* ... */
  ]
}
```
> **Regra:** se uma fonte não existe (ex.: motor de reservas não conectado), o campo vem `null` com `source` indicando o porquê. O front renderiza "—" + selo de origem; **nunca inventa número**.

---

## 4. OTA vs Direto — ✅/🆕

### GET `/clients/:id/ota-data?from&to` — ✅
```jsonc
// Response 200
{ "period": { "from": "2026-05-01", "to": "2026-05-31" },
  "breakdown": [
    { "channel": "Booking.com", "revenue": 1800000, "commissionPct": 18, "commission": 324000, "bookings": 42 },
    { "channel": "Expedia",     "revenue": 1400000, "commissionPct": 17, "commission": 238000, "bookings": 31 }
  ],
  "totals": { "otaRevenue": 3200000, "otaCommission": 562000, "directRevenue": 8500000 },
  "source": "manual" }
```

### POST `/clients/:id/ota-data` — 🆕 (admin)
Inserção manual mensal.
```jsonc
// Request
{ "month": "2026-05", "breakdown": [
    { "channel": "Booking.com", "revenue": 1800000, "commissionPct": 18, "bookings": 42 } ],
  "directRevenue": 8500000 }
// Response 201 → shape de GET
```

---

## 5. Campanhas — ✅/🔜

### GET `/hotel-portal/:clientId/campaigns?from&to` — ✅
```jsonc
// Response 200
{ "data": [
    { "id": "cmp_1", "channel": "meta_ads", "name": "Reservas Diretas - Inverno",
      "spend": 800000, "impressions": 240000, "clicks": 5200, "cpl": 1538,
      "conversions": 143, "attributedRevenue": 6000000, "roas": 7.5, "source": "server" }
  ], "source": "auto" }
```

### POST `/clients/:id/integrations/meta_ads/sync` — 🔜
Dispara sync manual fora do cron. Resposta `202 Accepted` + `jobId`. (Ver Seção 9.)

---

## 6. Site / Funil — ✅/🔜 (cuidado com métricas-fantasma)

### GET `/hotel-portal/:clientId/site-metrics?from&to` — ✅
```jsonc
// Response 200
{
  "traffic": { "sessions": 9800, "organic": 4100, "paid": 3900, "direct": 1800, "source": "auto" },
  "funnel": {
    // Campos que dependem do motor de reservas. Se não houver fonte → null + source.
    "engineSearches":  { "value": null, "source": "manual" },
    "checkoutStarts":  { "value": null, "source": "manual" },
    "bookingsConfirmed": { "value": 143, "source": "server" }   // vem do webhook do motor
  }
}
```
> **Decisão (Plano §3.4):** enquanto o motor não estiver conectado, `engineSearches`/`checkoutStarts` vêm `null`. Front mostra "via motor de reservas (em breve)" — **não** zero, **não** número inventado.

---

## 7. Métricas avançadas — ✅/🔜
Padrão comum: `GET` para ler, `POST` para inserção manual (admin). Todas aceitam `?from&to` ou `?month`.

```
GET  /metrics/:id/kpi             → { revpar, adr, occupancy, source }       ✅
POST /metrics/:id/kpi             → inserção manual mensal                    🆕
GET  /metrics/:id/reputation      → { google, tripadvisor, booking: {score, volume}, source }  ✅
GET  /metrics/:id/booking-window  → { avgLeadTimeDays, distribution[], source }  ✅
GET  /metrics/:id/rate-parity     → { checks[]: {ota, otaRate, directRate, parity}, source }    ✅
GET  /metrics/:id/budget          → { planned, spent, byChannel[], source }   ✅
```
Exemplo `GET /metrics/:id/kpi`:
```jsonc
{ "month": "2026-05", "revpar": 18900, "adr": 27000, "occupancy": 70.0, "currency": "BRL", "source": "manual" }
```

---

## 8. Reservas + Webhook do motor — ✅

### POST `/webhooks/booking/:clientId` — ✅ (chamado pelo motor de reservas)
**Acesso:** sem JWT; autenticado por **assinatura HMAC** no header `X-Reserve-Signature` (segredo por cliente). Identifica o motor pela credencial e normaliza para `HotelReservation`.
```jsonc
// Request (normalizado internamente; cada adapter traduz o payload nativo do motor)
{
  "externalId": "STY-99231",
  "engine": "stays",
  "status": "confirmed",            // confirmed | cancelled | modified
  "channel": "direct",              // direct | ota:booking | ota:expedia ...
  "amount": 420000, "currency": "BRL",
  "checkIn": "2026-07-10", "checkOut": "2026-07-13",
  "bookedAt": "2026-06-05T11:19:00Z",
  "guest": { "emailHash": "<sha256>", "phoneHash": "<sha256>" }  // já com hash p/ LGPD
}
// Response 200
{ "received": true, "reservationId": "res_77", "conversionDispatched": true }
```
> **Efeito colateral crítico:** ao receber `status: confirmed` + `channel: direct`, o backend **também** dispara a conversão server-side (Seção 9.6). É isso que torna o webhook a fonte de verdade da atribuição.

### GET `/clients/:id/reservations?from&to&channel` — ✅
Lista normalizada (direct vs ota), com `source`.

---

## 9. Integrações + Server-side — 🔜 (Fase 2, o diferencial)

### 9.1 GET `/clients/:id/integrations`
Status de todas as conexões (mesmo shape do array `integrations` da Seção 2).

### 9.2 POST `/clients/:id/integrations/:provider/connect`
`:provider` ∈ `meta_ads | google_ads | ga4`. Inicia OAuth.
```jsonc
// Response 200
{ "authUrl": "https://www.facebook.com/v19.0/dialog/oauth?..." }  // front redireciona
```

### 9.3 GET `/integrations/:provider/callback`
Callback do OAuth → troca code por token → grava criptografado em `HotelApiCredential` → status `connected`. Redireciona o front para a tela de config.

### 9.4 POST `/clients/:id/integrations/:provider/sync`
Dispara sync sob demanda (além do cron).
```jsonc
// Response 202
{ "jobId": "job_123", "status": "queued" }
```

### 9.5 DELETE `/clients/:id/integrations/:provider`
Desconecta e revoga o token. `204 No Content`.

### 9.6 POST `/clients/:id/conversions` — (interno; pode ser só serviço, não rota pública)
Envia o evento de conversão para **Meta CAPI + Google Enhanced Conversions** com dedup por `event_id`.
```jsonc
// Request (gerado pelo webhook de reserva OU pelo pixel "purchase")
{
  "eventName": "Purchase",
  "eventId": "res_77",                 // mesmo id do pixel client-side → dedup
  "eventTime": "2026-06-05T11:19:00Z",
  "value": 420000, "currency": "BRL",
  "channel": "meta_ads",
  "userData": { "emailHash": "<sha256>", "phoneHash": "<sha256>" },
  "attribution": { "clickId": "fbclid|gclid", "window": "7d_click" }
}
// Response 200
{ "meta": { "ok": true }, "google": { "ok": true } }
```

---

## 10. Hóspedes (CRM) — ✅/🔭
```
GET /guests/:clientId?segment=leisure|business|honeymoon   → lista segmentada   ✅
GET /guests/:clientId/reactivation                          → candidatos a reativar  ✅
```

---

## 11. WhatsApp — ✅

### Templates / mensagens — 🔭
```
GET  /clients/:id/whatsapp/templates       → WhatsAppTemplate[]
POST /clients/:id/whatsapp/messages        → enfileira envio (pré-chegada/pós-estadia/upsell)
```

### Links rastreáveis — ✅ (diferencial; manter no MVP)
```jsonc
// POST /clients/:id/whatsapp/links  (admin)
// Request
{ "label": "Campanha Inverno", "destinationNumber": "+5535999990000", "message": "Olá! Quero reservar." }
// Response 201
{ "id": "wal_1", "code": "inv26", "shortUrl": "https://r.reserve.app/wa/inv26" }
```
```
GET /wa/:code                       → 302 redirect p/ WhatsApp + registra clique   ✅ (público)
GET /clients/:id/whatsapp/links/:linkId/stats?from&to
   → { clicks, byCity[], byDevice[], byDay[] }                                       ✅
```

---

## 12. Relatório mensal — ✅/🆕

### GET `/clients/:id/reports` — ✅
Lista de relatórios (status `draft|review|published`).

### GET `/clients/:id/reports/:reportId` — ✅
```jsonc
{ "id": "rep_1", "month": "2026-05", "status": "published",
  "executiveSummary": "Maio teve recorde de reserva direta...",
  "highlights": ["72,6% direto", "R$ 15.300 de comissão recuperada"],
  "overviewSnapshot": { /* snapshot do /overview no fechamento */ },
  "publishedAt": "2026-06-03T10:00:00Z" }
```

### POST `/clients/:id/reports` — 🆕 (admin) · cria draft
### PATCH `/clients/:id/reports/:reportId` — 🆕 (admin) · edita / move para `review`
### POST `/clients/:id/reports/:reportId/publish` — 🆕 (admin)
Publica e dispara notificação ao gerente.
```jsonc
// Response 200
{ "id": "rep_1", "status": "published", "notified": true }
```

---

## 13. Matriz de acesso (resumo)

| Recurso | super_admin / admin | user (gerente) |
|---|---|---|
| `/clients` (lista) | ✅ leitura+escrita | ❌ |
| `/clients/:id` (próprio) | ✅ | ✅ leitura |
| `/overview`, `/ota-data`, `/campaigns`, `/site-metrics`, `/metrics/*` | ✅ ler+inserir | ✅ **só leitura** |
| Inserções `POST/PATCH` de dados manuais | ✅ | ❌ |
| Integrações (connect/sync/delete) | ✅ | ❌ |
| Relatório: editar/publicar | ✅ | ❌ |
| Relatório: visualizar publicado | ✅ | ✅ |
| Links WhatsApp: criar | ✅ | ❌ |
| Links WhatsApp: ver stats | ✅ | ✅ |
| `/webhooks/booking/:clientId` | HMAC (sem JWT) | — |

---

## 14. Checklist de sincronia (para cada PR que toca a API)

- [ ] Contrato (este arquivo) atualizado **antes** do código.
- [ ] DTO do NestJS bate com o JSON aqui (nomes, tipos, centavos, `source`).
- [ ] Swagger/OpenAPI regenerado (`@nestjs/swagger`).
- [ ] Client tipado do front regenerado a partir do OpenAPI.
- [ ] Mock do front atualizado com o JSON de exemplo (se backend ainda não subiu).
- [ ] Campos ausentes voltam `null` + `source` — nunca número inventado.
- [ ] Multi-tenant validado na rota nova.
