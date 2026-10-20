# Roteiro de deploy na VPS (Hostinger)

Este guia leva do zero (nada contratado) ate tudo no ar. Escrito para quem nao e
especialista em infraestrutura: siga na ordem e copie os comandos.

## O que vai rodar onde

| Peca | Onde | Endereco |
|---|---|---|
| API (backend) | VPS, Docker | https://api.reservemkt.com.br |
| Bot (n8n + Postgres do bot) | VPS, Docker | https://bot.reservemkt.com.br |
| Redis (filas) | VPS, Docker (interno) | nao e publico |
| HTTPS automatico | VPS, Caddy (Docker) | portas 80 e 443 |
| Banco do painel | Neon (Sao Paulo) | ja existe, nao muda |
| Painel (Next.js) | Vercel | https://painel.reservemkt.com.br |

Tudo na VPS sobe com um unico comando (`docker compose`), definido em
`deploy/docker-compose.prod.yml`.

> **ATENCAO - CHAVES DE CRIPTOGRAFIA (leia antes de preencher qualquer coisa)**
>
> `ENCRYPT_PRIVATE_KEY`, `AES_ENCRYPTION_KEY`, `JWT_PRIVATE_KEY` e `JWT_SECRET` do
> servidor **tem de ser exatamente iguais** aos do `.env` local. Os segredos que ja
> estao no banco da Neon (tokens do Stripe, Google, Meta, senhas dos usuarios, chaves
> dos clientes) foram criptografados com elas. Se voce gerar valores novos, tudo isso
> fica ilegivel e todo mundo precisa refazer senha e conexoes.
> O mesmo vale para `N8N_ENCRYPTION_KEY` do n8n (copie de `C:\reserve-bot\.env`).
> Guarde essas chaves tambem em um gerenciador de senhas: se perder, nao ha como recuperar.

---

## 1. Contratar a VPS

1. Na Hostinger, contrate o plano **VPS KVM 2** (2 vCPU, 8 GB RAM).
2. Sistema operacional: **Ubuntu 24.04**.
3. Localizacao do servidor: **Brasil (Sao Paulo)**, para ficar perto da Neon e dos clientes.
4. Defina uma senha forte de root (ou cadastre sua chave SSH, se tiver).
5. Anote o **IP publico** da VPS (aparece no painel da Hostinger). Vou chamar de `IP_DA_VPS`.

## 2. Primeiro acesso por SSH

No Windows, abra o PowerShell:

```
ssh root@IP_DA_VPS
```

Digite "yes" na primeira vez e depois a senha.

## 3. Criar um usuario comum (nao usar root no dia a dia)

```
adduser deploy            # escolha uma senha forte; o resto pode dar Enter
usermod -aG sudo deploy
```

Depois, saia (`exit`) e entre de novo como o novo usuario: `ssh deploy@IP_DA_VPS`.

## 4. Firewall (so portas 22, 80 e 443)

```
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
sudo ufw status
```

Importante: libere a 22 **antes** de ligar o firewall, senao voce perde o acesso.
Nenhuma porta de banco ou Redis fica aberta; so o Caddy (80/443) fala com a internet.

## 5. Instalar o Docker

```
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy
```

Saia e entre de novo no SSH (para o grupo valer) e teste:

```
docker --version
docker compose version
```

## 6. Baixar o codigo (repositorio privado)

O repositorio e privado, entao a VPS precisa de uma permissao. Duas opcoes:

**Opcao A - chave de deploy (recomendada):**

```
ssh-keygen -t ed25519 -C "vps-reserve" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Copie o texto exibido. No GitHub: repositorio `backend_reserve` > Settings > Deploy keys >
Add deploy key > cole, de um nome e deixe **sem** permissao de escrita. Depois:

```
git clone git@github.com:SEU_USUARIO_OU_ORG/backend_reserve.git
```

**Opcao B - token:** no GitHub crie um *fine-grained personal access token* com acesso
**somente leitura** (Contents: Read) ao repositorio e use
`git clone https://SEU_USUARIO:TOKEN@github.com/SEU_USUARIO_OU_ORG/backend_reserve.git`.
(O token fica gravado no `.git/config`; prefira a opcao A.)

Depois entre na pasta: `cd backend_reserve`. Todos os comandos abaixo rodam **dentro dessa pasta**.

## 7. DNS (no site onde o dominio reservemkt.com.br esta registrado)

Crie estes registros:

| Tipo | Nome | Valor |
|---|---|---|
| A | `api` | `IP_DA_VPS` |
| A | `bot` | `IP_DA_VPS` |
| CNAME | `painel` | o valor que a Vercel mostrar (ver passo 13; costuma ser `cname.vercel-dns.com`) |

Se o provedor usar Cloudflare, deixe os registros de `api` e `bot` como **DNS only**
(nuvem cinza), senao o certificado automatico pode falhar. A propagacao leva de
minutos a algumas horas. Para conferir: `nslookup api.reservemkt.com.br`.

**Suba a stack so depois do DNS de `api` e `bot` apontar para o IP**, senao o Caddy
nao consegue emitir o certificado HTTPS (ele tenta de novo sozinho, mas pode demorar).

## 8. Preencher os dois arquivos de segredos

```
cp deploy/.env.production.example deploy/.env.production
cp deploy/.env.bot.example deploy/.env.bot
nano deploy/.env.production
nano deploy/.env.bot
```

(No `nano`: salvar = `Ctrl+O`, Enter; sair = `Ctrl+X`.) Esses arquivos **nunca** vao para o git.

### 8.1 `deploy/.env.production` (backend)

- Copie do `.env` local, **sem mudar**: `ENCRYPT_PRIVATE_KEY`, `AES_ENCRYPTION_KEY`,
  `JWT_PRIVATE_KEY`, `JWT_ALGORITHM`, `JWT_SECRET`, `STRIPE_*`, `GOOGLE_*`, `META_*`,
  `BLOB_READ_WRITE_TOKEN`, `INTERNAL_API_KEY`, `CRON_SECRET`.
- `JWT_PRIVATE_KEY` e lido **cru**, em uma linha so (o codigo nao converte `\n`). Cole o
  mesmo valor do `.env` local, sem aspas. Se o valor tiver `$`, coloque entre aspas simples.
- `DATABASE_URL`: a URL da Neon, terminando com `?sslmode=require`.
  A API usa SSL verificado por esse parametro. (A pasta `public/` com o certificado
  da AWS nao entra na imagem de proposito: com ela, a conexao com a Neon seria recusada.)
- `REDIS_HOST=redis`, `REDIS_PORT=6379`. Invente uma `REDIS_PASSWORD` nova e longa
  (`openssl rand -hex 24`); ela so existe dentro da VPS.
- `CORS_ORIGINS=https://painel.reservemkt.com.br` (varias origens: separe por virgula, sem barra no fim).
- `GOOGLE_REDIRECT_URI`: atualize para o dominio novo e cadastre o mesmo valor no Google Cloud Console.
- `CRON_SECRET`: minimo 32 caracteres (`openssl rand -hex 32`); sem isso as rotas `/api/internal/cron/*` recusam tudo.
- `NODE_ENV=production`, `PORT=3000` ja vem no exemplo.
- Variaveis opcionais (AWS, bucket do CMS, WhatsApp digest, `APP_URL`, `FREE_PLAN_SLUG`)
  estao comentadas com `#`. So descomente se usar, e nunca as deixe vazias.

### 8.2 `deploy/.env.bot` (n8n + Postgres do bot)

- `POSTGRES_PASSWORD`: senha nova e forte (so letras e numeros).
- `DB_POSTGRESDB_PASSWORD`: **o mesmo valor** de `POSTGRES_PASSWORD`.
- `N8N_ENCRYPTION_KEY`: **a mesma** de `C:\reserve-bot\.env` (aviso no topo).
- `TZ=America/Sao_Paulo`.

> Em producao o backend so aceita URLs `https` com dominio publico para falar com o n8n
> (protecao contra SSRF). Por isso o n8n tem dominio proprio (`bot.reservemkt.com.br`).

## 9. Subir tudo

```
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

A primeira vez demora (varios minutos): ele constroi a imagem da API e baixa as demais.
Acompanhe:

```
docker compose -f deploy/docker-compose.prod.yml ps
docker compose -f deploy/docker-compose.prod.yml logs -f api
```

(`Ctrl+C` sai dos logs sem parar nada.)

## 10. Rodar as migrations do banco (Neon)

```
docker compose -f deploy/docker-compose.prod.yml --profile tools run --rm migrate
```

Deve terminar com "No pending migrations to apply" ou aplicar as pendentes. Se aparecer
erro de conexao/lock com a URL "pooled" da Neon, rode uma vez trocando em
`.env.production` a `DATABASE_URL` pela URL **direct** (sem `-pooler` no endereco),
e depois volte para a pooled.

**Rode as migrations sempre que atualizar o codigo com migration nova** (passo 15).
Antes da primeira vez em producao, faca um backup/branch na Neon.

## 11. Conferir a API

No navegador ou no terminal:

```
curl https://api.reservemkt.com.br/health
```

Tem de responder `OK`. Se o certificado ainda nao saiu, espere 1-2 min e veja
`docker compose -f deploy/docker-compose.prod.yml logs caddy`.

## 12. Migrar o n8n do seu computador para a VPS

Objetivo: levar workflows, credenciais e execucoes do n8n local para a VPS.

**No seu computador (PowerShell), com o Docker local rodando:**

```
cd C:\reserve-bot
docker compose exec -T postgres pg_dumpall -U postgres --no-role-passwords > bot-dump.sql
```

(Se o servico tiver outro nome, use `docker compose ps` para ver. O dump contem os dois
bancos: `n8n` e `pousada`.) Copie para a VPS:

```
scp bot-dump.sql deploy@IP_DA_VPS:~/
```

**Na VPS:**

```
cd ~/backend_reserve
# 1. para o n8n para ele nao escrever enquanto restauramos
docker compose -f deploy/docker-compose.prod.yml stop n8n
# 2. restaura (mensagens "already exists" para os bancos n8n/pousada e para o usuario postgres sao normais)
docker compose -f deploy/docker-compose.prod.yml exec -T bot-postgres psql -U postgres -f - < ~/bot-dump.sql
# 3. sobe o n8n de novo
docker compose -f deploy/docker-compose.prod.yml up -d n8n
```

Depois:

1. Abra https://bot.reservemkt.com.br e entre com o mesmo usuario/senha do n8n local.
   (Se pedir para criar o dono, o restore nao pegou: veja os logs do n8n e do postgres.)
2. A `N8N_ENCRYPTION_KEY` igual a local faz as credenciais salvas funcionarem. Abra uma
   credencial e teste a conexao.
3. **Reative os workflows** (eles voltam desativados ou com webhooks de teste). Ative um por um.
4. **Troque as URLs que apontavam para o ngrok** nos workflows (por exemplo o HTTP Request que
   chama o painel/backend) por:
   - ingest do painel: `https://api.reservemkt.com.br/api/ingest/bot-events`
   - Canal C (reservas): `https://api.reservemkt.com.br/api/webhooks/booking/{clientId}`
   - cron do bot: `POST https://api.reservemkt.com.br/api/internal/cron/bot-sync` com `Authorization: Bearer <CRON_SECRET>`
5. No **painel**, em cada hotel, atualize a URL do Canal B (painel para o bot) para o endereco do
   webhook do n8n em `https://bot.reservemkt.com.br/webhook/...` (sem ngrok).
6. Atualize na Meta (WhatsApp Cloud API) a URL do webhook para a nova, se ela apontava para o ngrok.
7. Desligue o n8n/ngrok local so depois de testar uma mensagem de ponta a ponta.

Apague o `bot-dump.sql` da VPS e do computador quando terminar (ele contem dados do bot).

## 13. Vercel (painel)

1. Projeto do painel na Vercel > Settings > **Domains** > adicione `painel.reservemkt.com.br`.
   A Vercel mostra o valor do CNAME (passo 7); crie/ajuste no DNS.
2. Settings > **Environment Variables** (Production). O build do frontend le estas:

   | Variavel | Valor |
   |---|---|
   | `NEXT_PUBLIC_RESERVE_API_URL` | `https://api.reservemkt.com.br/api` |
   | `NEXT_PUBLIC_RESERVE_API_EMAIL_URL` | URL da API de e-mail, se usada (senao deixe como esta) |
   | `NEXT_PUBLIC_BLOG_SECRET_KEY` | a mesma que ja esta configurada hoje |

   Outras (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_EMAIL_URL`) sao alternativas antigas usadas
   so se as `RESERVE_*` estiverem vazias. `NEXT_PUBLIC_LOCAL_API_URL`, `NEXT_LOCAL_API_URL` e
   `NEXT_PUBLIC_APP_URL` sao de desenvolvimento local; nao precisam existir na Vercel.
3. Faca um **Redeploy** (variaveis `NEXT_PUBLIC_*` so valem depois de um novo build).
4. Confirme que `CORS_ORIGINS` no `deploy/.env.production` tem `https://painel.reservemkt.com.br`.
   Se mudar, aplique: `docker compose -f deploy/docker-compose.prod.yml up -d api`.
5. Teste o login no painel.

## 14. Backups e monitoramento

**Backup do banco do bot (diario, na VPS):**

```
chmod +x deploy/scripts/backup-bot-db.sh
mkdir -p ~/backups
crontab -e
```

Adicione ao final do crontab (todo dia as 03:30, guarda 14 dias em `~/backups/bot-db`):

```
30 3 * * * /home/deploy/backend_reserve/deploy/scripts/backup-bot-db.sh >> /home/deploy/backups/backup.log 2>&1
```

Teste uma vez a mao: `./deploy/scripts/backup-bot-db.sh` e veja o arquivo `.sql.gz`.
Copie de vez em quando um backup para fora da VPS (`scp` para o seu computador).

**Backup semanal da Hostinger:** no painel da VPS, ative os backups/snapshots semanais.
O banco do painel e a Neon (ela tem seus proprios backups; confira o periodo do seu plano).

**Monitoramento (gratis):** crie conta no UptimeRobot (ou BetterStack) e adicione dois monitores HTTP(s):

- `https://api.reservemkt.com.br/health` (a cada 5 min, espera 200)
- `https://bot.reservemkt.com.br/healthz` (espera 200)

Configure aviso por e-mail/WhatsApp.

## 15. Como atualizar depois

```
cd ~/backend_reserve
git pull
docker compose -f deploy/docker-compose.prod.yml up -d --build
docker compose -f deploy/docker-compose.prod.yml --profile tools run --rm migrate   # so se houver migration nova
docker image prune -f      # limpa imagens antigas (opcional)
```

A API fica fora do ar por alguns segundos ao trocar de container. Nao rode isso no
meio de uma campanha de pico.

## 16. Ver logs e estado

```
docker compose -f deploy/docker-compose.prod.yml ps                 # tudo de pe?
docker compose -f deploy/docker-compose.prod.yml logs -f api        # API
docker compose -f deploy/docker-compose.prod.yml logs -f n8n        # n8n
docker compose -f deploy/docker-compose.prod.yml logs --tail=200 caddy
docker stats --no-stream                                            # memoria/CPU
```

Os logs giram sozinhos (10 MB x 5 arquivos por servico).

Reiniciar um servico: `docker compose -f deploy/docker-compose.prod.yml restart api`.

## 17. Rollback (voltar a versao anterior)

```
cd ~/backend_reserve
git log --oneline -5                 # ache o commit que funcionava
git checkout COMMIT_BOM
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

Para voltar ao normal depois: `git checkout main`. Migrations **nao** voltam sozinhas: as do
projeto sao aditivas, entao o codigo antigo costuma continuar funcionando com o banco novo;
se uma migration destrutiva for o problema, restaure o backup/branch da Neon feito antes.
Rollback do n8n: restaure um `.sql.gz` de `~/backups/bot-db` (pare o n8n, `gunzip -c arquivo | docker compose ... exec -T bot-postgres psql -U postgres -f -`, suba o n8n).

## 18. Atencao: so uma instancia da API

A API tem 18 tarefas agendadas (`@Cron`). Elas devem rodar em **uma unica instancia sempre
ligada**. Nao escale o servico `api` para mais de 1 replica e nao rode a API tambem em outro
lugar (Vercel, outra VPS, maquina local apontando para a mesma Neon) enquanto a VPS estiver no ar.

## 19. Checklist final para o time do bot

- [ ] **Canal A (bot para painel) - ingest de eventos:** `POST https://api.reservemkt.com.br/api/ingest/bot-events` (ate 250 eventos por chamada, chave do tenant).
- [ ] **Canal B (painel para bot):** URL do webhook do n8n cadastrada no painel por hotel: `https://bot.reservemkt.com.br/webhook/...` (https e dominio publico, obrigatorio em producao). Segredo HMAC gerado pelo painel.
- [ ] **Canal C (reservas/PMS):** `POST https://api.reservemkt.com.br/api/webhooks/booking/{clientId}` (assinatura HMAC).
- [ ] **Cron do bot:** `POST https://api.reservemkt.com.br/api/internal/cron/bot-sync` com `Authorization: Bearer <CRON_SECRET>`.
- [ ] Workflows reativados no n8n da VPS e sem nenhuma URL de ngrok sobrando.
- [ ] Webhook da Meta (WhatsApp) apontando para o dominio novo.
- [ ] `https://api.reservemkt.com.br/health` responde `OK` e o login do painel funciona.
- [ ] Backup diario rodando (`ls ~/backups/bot-db`) e monitor de uptime ativo.
- [ ] Chaves de criptografia guardadas em local seguro.
