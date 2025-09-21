# RFC: Módulo Admin

## Descrição
Módulo responsável pela autenticação e informações do administrador do sistema.

## Rotas

- `POST /admin/authenticate`
  - Autentica um administrador no sistema.

- `GET /admin/me`
  - Retorna as informações do administrador autenticado (requer autenticação). 