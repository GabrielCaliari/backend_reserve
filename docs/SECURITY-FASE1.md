# Fase 1 — Hardening de bootstrap e credenciais

Executado em 2026-07-27. Plano: `docs/superpowers/plans/2026-07-26-fase1-backend-hardening.md`.

## Mudanças de comportamento visíveis

| Mudança | Efeito |
|---|---|
| `ValidationPipe` com `whitelist: true` | campo de body/query sem decorator do class-validator é **removido** silenciosamente antes de chegar no handler |
| `ThrottlerGuard` global | 100 req/min por IP no default; 5 req/min nas rotas de autenticação |
| Lockout de conta | 5 senhas erradas → HTTP **423** por 15 min; cada ciclo de 5 dobra a janela, teto 24 h |
| Senha forte | criação e troca de senha exigem 10+ caracteres com maiúscula, minúscula, número e símbolo. **Login não mudou** — senhas curtas existentes continuam entrando |
| PBKDF2 v2 | 210.000 iterações. Hashes antigos (856) continuam validando e são re-hasheados no próximo login bem-sucedido |
| Swagger | `/api/docs` retorna 404 em produção, exceto com `SWAGGER_ENABLED=true` |
| JWT forjado | passa a responder `invalid` em vez de `expired` |
| Timeout de upload | 5 min só em POST/PUT/PATCH sob os prefixos de rota que hospedam upload |

## Variáveis de ambiente novas

- `SWAGGER_ENABLED` (opcional) — `true` monta o Swagger em produção. Default: não monta.

## Custo de login

O fluxo de login executa PBKDF2 sobre a senha **duas vezes** (`AdminService.authenticate` e `AdminSessionTokenRepository.create`). A 210.000 iterações isso soma cerca de 200 ms por login. Resolver a duplicação é decisão pendente — está registrado como dívida.

## Fora de escopo desta fase

- RBAC por permissão, deny-by-default, `@Public()` → Fase 2
- CORS dinâmico por domínio de tenant → Fase 3
- 2FA/TOTP → não planejado
- Verificação de senha contra base de vazamento → não planejado
