# Pousada demo (ambiente local)

Hotel de teste que recebe eventos de um bot simulado, para ver o painel inteiro
com dados: conversas no estilo WhatsApp Web, funil, erros, socorro, feedbacks,
gasto do Meta por anuncio, ROI e ROAS.

Tudo roda contra o banco **local** `reserve_demo`. O `.env` do repositorio aponta
para a Neon de producao; nenhum destes scripts usa esse banco.

## Uma vez

```bash
docker start reserve-test-pg reserve-test-redis
docker exec reserve-test-pg psql -U test -d reserve_test -c "CREATE DATABASE reserve_demo"
DATABASE_URL=postgresql://test:test@127.0.0.1:15432/reserve_demo npx prisma migrate deploy
DATABASE_URL=postgresql://test:test@127.0.0.1:15432/reserve_demo npx prisma db seed
```

## Subir

```bash
node scripts/demo/start-local.cjs              # API em http://localhost:3002
node scripts/demo/setup-demo-hotel.cjs         # tenant, hotel, chave do bot, gasto Meta (idempotente)
node scripts/demo/simulate-bot.cjs --historico 60   # 60 conversas nos ultimos 30 dias
node scripts/demo/simulate-bot.cjs --ao-vivo        # conversas novas chegando em tempo real
```

No front: `node scripts/dev-local-api.cjs` (painel em http://localhost:3000 apontando
para a API local).

Logins (super admin e hotel) e a chave do bot ficam em
`scripts/demo/.demo-hotel.local.json`, fora do git.

## Conferir as rotas

```bash
node scripts/demo/smoke-routes.cjs
```

Chama todas as rotas GET do painel listadas no Swagger com os ids da pousada demo.
Sai com erro se alguma responder 5xx; 4xx com id ficticio ou parametro
obrigatorio ausente e esperado.

## O que o simulador manda

Cada conversa segue um roteiro com desfecho (reserva, perda, socorro com humano
assumindo, erro tecnico do bot, em andamento), vinda de anuncio (ad_id de
`demo-ads.cjs`, os mesmos do gasto gravado no setup), link rastreavel ou organico.
Telefones na faixa ficticia `+55 11 90000-xxxx`.
