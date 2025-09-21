# RFC: Módulo PI-Bot

## Descrição
Módulo responsável por interações automatizadas via bot, incluindo mensagens públicas e privadas.

## Rotas

- `POST /pi-bot/message`
  - Envia uma mensagem privada utilizando o bot (requer autenticação).

- `POST /pi-bot/public-message`
  - Envia uma mensagem pública utilizando o bot. 