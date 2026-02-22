# Lead Collection - Simplificação e Integração com Geolocalização

## Resumo das Mudanças

Este documento descreve as mudanças implementadas no sistema de Lead Collection para simplificar a autenticação e adicionar rastreamento de geolocalização.

## 1. Simplificação do Sistema de Autenticação

### Antes
- Sistema complexo com 3 modos de acesso: `public`, `private` (CORS), `restricted` (secret key)
- Validação de domínios permitidos
- Lógica condicional para diferentes modos

### Depois
- Sistema único e simples: apenas autenticação por secret key
- Inspirado no sistema do Blog CMS
- Sem complexidade de CORS ou validação de domínios

### Mudanças na Entidade LeadCollection

**Campos removidos:**
- `accessMode` (enum)
- `allowedDomains` (array)
- `sourceType`, `sourceChannel`, `sourceCampaign`
- `metadata`

**Campos mantidos:**
- `secretKeyHash` (string) - Hash SHA-256 da chave secreta
- `secretKeySalt` (string) - Salt para o hash
- Todos os campos básicos (id, name, slug, sour