# RFC: Módulo Brand

## Descrição
Módulo responsável pelo gerenciamento de marcas, leads e alertas de marcas.

## Rotas

- `POST /brand/`
  - Cria uma nova marca para o usuário autenticado.

- `POST /brand/lead`
  - Cria um lead de marca.

- `GET /brand/`
  - Lista as marcas do usuário autenticado.

- `POST /brand/public-brand-find/:brand_name`
  - Busca pública de marca pelo nome.

- `GET /brand/:brand_id`
  - Busca uma marca específica do usuário autenticado.

- `GET /brand/alerts-by-brand-name/:brand_id`
  - Lista alertas relacionados a uma marca específica do usuário autenticado. 