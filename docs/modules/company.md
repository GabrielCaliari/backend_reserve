# RFC: Módulo Company

## Descrição
Módulo responsável pelo gerenciamento e exportação de informações de empresas.

## Rotas

- `POST /company/`  
  Lista empresas de acordo com os filtros e parâmetros enviados (requer autenticação).

- `GET /company/export/count/:search_hash`  
  Retorna a contagem de empresas para exportação, conforme o filtro (requer autenticação).

- `POST /company/export/file/:search_hash`  
  Exporta os dados das empresas filtradas para arquivo (requer autenticação).

- `GET /company/export/file/:id`  
  Retorna informações sobre um arquivo de exportação específico (requer autenticação).

- `GET /company/export/download/:id`  
  Realiza o download do arquivo de exportação (requer autenticação). 