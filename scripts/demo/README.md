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
node scripts/demo/start-local.cjs --port 3012  # compila e sobe a API em http://localhost:3012
DEMO_API_URL=http://localhost:3012/api node scripts/demo/setup-demo-hotel.cjs    # tenant, hotel, chave do bot, gasto Meta (idempotente)
DEMO_API_URL=http://localhost:3012/api node scripts/demo/simulate-bot.cjs --historico 60
DEMO_API_URL=http://localhost:3012/api node scripts/demo/simulate-bot.cjs --ao-vivo   # rode UM so
```

No front: `node scripts/dev-local-api.cjs --api http://localhost:3012/api` (painel em
http://localhost:3000). O `.claude/launch.json` do front ja sobe os dois assim.

Sem `--port`, a API usa a 3002. Os dois launchers rodam o servidor no proprio
processo: parar o launcher para o servidor, sem deixar porta presa.

Rode um simulador ao vivo por vez: cada um abre uma conversa a cada ~25 s, e dois
ou tres juntos enchem a lista de "ao vivo".

Logins (super admin e hotel) e a chave do bot ficam em
`scripts/demo/.demo-hotel.local.json`, fora do git.

## Conferir as rotas

```bash
DEMO_API_ORIGIN=http://localhost:3012 node scripts/demo/smoke-routes.cjs
```

Chama todas as rotas GET do painel listadas no Swagger com os ids da pousada demo.
Sai com erro se alguma responder 5xx; 4xx com id ficticio ou parametro
obrigatorio ausente e esperado.

## O que o simulador manda

Cada conversa segue um roteiro com desfecho (reserva, perda, socorro com humano
assumindo, erro tecnico do bot, em andamento), vinda de anuncio (ad_id de
`demo-ads.cjs`, os mesmos do gasto gravado no setup), link rastreavel ou organico.
Telefones na faixa ficticia `+55 11 90000-xxxx`.
