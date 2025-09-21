# RFC: Módulo Post

## Descrição
Módulo responsável pela gestão e consulta de posts e metadados de posts.

## Rotas

- `GET /post/`
  - Lista todos os posts com paginação.

- `GET /post/by-slug/:slug`
  - Busca um post pelo slug.

- `GET /post/metadata/by-slug/:slug`
  - Busca os metadados de um post pelo slug.

- `GET /post/sitemap`
  - Retorna o sitemap dos posts. 