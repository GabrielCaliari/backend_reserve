# RFC: Módulo User

## Descrição
Módulo responsável pelo gerenciamento de usuários, autenticação, pagamentos e geração de tokens.

## Rotas

- `POST /user/`
  - Cria um novo usuário.

- `POST /user/pre/create`
  - Pré-cadastro de usuário.

- `POST /user/authenticate`
  - Autentica um usuário.

- `GET /user/feed`
  - Retorna o feed do usuário autenticado (requer autenticação).

- `GET /user/me`
  - Retorna as informações do usuário autenticado (requer autenticação).

- `POST /user/generate-payment-account-link`
  - Gera um link para conta de pagamento (requer autenticação).

- `POST /user/checkout/:slug/:period`
  - Realiza o checkout de um plano (requer autenticação).

- `POST /user/order-brand-analysis/checkout/:slug`
  - Realiza o checkout de uma análise de marca (requer autenticação).

- `POST /user/webhook/generate-tokens/:key/:user_id/:tokens`
  - Gera tokens para o usuário via webhook. 