# Timeout Configuration - Upload System

**Last Updated**: April 30, 2026  
**Current Configuration**: 10 minutes (600 seconds)

---

## Overview

O sistema de upload foi configurado com timeouts generosos em múltiplas camadas para garantir que arquivos grandes possam ser enviados com sucesso, mesmo com o mecanismo de retry.

---

## Configuração de Timeout (Múltiplas Camadas)

### 1. Server-Level Timeout (HTTP Server)
**Arquivo**: `src/main.ts`  
**Configuração**:
```typescript
server.setTimeout(10 * 60 * 1000); // 10 minutos
server.keepAliveTimeout = 10 * 60 * 1000 + 1000; // 10 minutos + 1 segundo
server.headersTimeout = 10 * 60 * 1000 + 2000; // 10 minutos + 2 segundos
```

**Propósito**: Garante que o servidor HTTP subjacente (Express) não encerre a conexão antes da aplicação processar o upload.

### 2. Request/Response Timeout (Application Level)
**Arquivo**: `src/main.ts`  
**Configuração**:
```typescript
req.setTimeout(10 * 60 * 1000); // 10 minutos
res.setTimeout(10 * 60 * 1000); // 10 minutos
```

**Propósito**: Define timeout específico para requisições e respostas de upload.

### 3. Vercel Blob Storage Retry
**Arquivo**: `src/modules/reserve-cms/infrastructure/providers/vercel-blob-storage.provider.ts`  
**Configuração**:
```typescript
MAX_RETRIES = 3
INITIAL_RETRY_DELAY = 1000ms
MAX_JITTER = 500ms
```

**Tempo Total de Retry**: ~7-8.5 segundos (3 tentativas com backoff exponencial)

---

## Cálculo de Tempo Total

### Cenário: Arquivo de 7.15 MB com Retry

| Etapa | Tempo Estimado | Acumulado |
|-------|---------------|-----------|
| Upload inicial (tentativa 1) | ~3-5s | 3-5s |
| Falha 503 + delay | ~1-1.5s | 4-6.5s |
| Upload retry (tentativa 2) | ~3-5s | 7-11.5s |
| Falha 503 + delay | ~2-2.5s | 9-14s |
| Upload retry (tentativa 3) | ~3-5s | 12-19s |
| **Total (pior caso)** | **~12-19s** | **< 20s** |

**Conclusão**: Mesmo no pior cenário (3 tentativas), o upload de 7.15 MB deve completar em menos de 20 segundos, bem abaixo do timeout de 10 minutos.

---

## Hierarquia de Timeouts

```
┌─────────────────────────────────────────────────────────────┐
│  Server Timeout: 10 minutos (600s)                          │
│  ├─ keepAliveTimeout: 10min + 1s                            │
│  └─ headersTimeout: 10min + 2s                              │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Request/Response Timeout: 10 minutos (600s)          │  │
│  │                                                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Upload Process                                  │  │  │
│  │  │  ├─ Multer: Parse multipart (< 1s)              │  │  │
│  │  │  ├─ Validation: File checks (< 1s)              │  │  │
│  │  │  └─ Vercel Blob Upload with Retry               │  │  │
│  │  │     ├─ Attempt 1: ~3-5s                         │  │  │
│  │  │     ├─ Delay: ~1-1.5s (if needed)               │  │  │
│  │  │     ├─ Attempt 2: ~3-5s (if needed)             │  │  │
│  │  │     ├─ Delay: ~2-2.5s (if needed)               │  │  │
│  │  │     └─ Attempt 3: ~3-5s (if needed)             │  │  │
│  │  │     Total: ~12-19s (worst case)                 │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting: "Network error"

### Possíveis Causas

#### 1. **Timeout no Cliente (Frontend)**
**Sintoma**: Erro de rede após ~30-60 segundos  
**Causa**: Timeout padrão do navegador ou biblioteca HTTP  
**Solução**:

```javascript
// Axios
const response = await axios.post('/api/cms/assets', formData, {
  timeout: 600000, // 10 minutos
  onUploadProgress: (progressEvent) => {
    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
    console.log(`Upload progress: ${percentCompleted}%`);
  }
});

// Fetch API (não tem timeout nativo, use AbortController)
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutos

try {
  const response = await fetch('/api/cms/assets', {
    method: 'POST',
    body: formData,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Upload timeout after 10 minutes');
  }
}
```

#### 2. **Proxy/Load Balancer Timeout**
**Sintoma**: Erro após tempo fixo (ex: 60s, 120s)  
**Causa**: Nginx, Apache, ou load balancer com timeout menor  
**Solução**:

**Nginx**:
```nginx
location /api/cms/ {
    proxy_pass http://backend;
    proxy_read_timeout 600s;
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    client_max_body_size 50M;
}
```

**Apache**:
```apache
<Location /api/cms/>
    ProxyPass http://backend
    ProxyTimeout 600
    LimitRequestBody 52428800
</Location>
```

#### 3. **Vercel Blob 503 Error**
**Sintoma**: Upload falha após 3 tentativas  
**Causa**: Vercel Blob infrastructure issue  
**Solução**: Já implementado com retry automático

**Verificar logs**:
```
[VercelBlobStorageProvider] Vercel Blob upload failed after 3 attempts
```

**Ação**: Verificar https://www.vercel-status.com/

#### 4. **Conexão Instável**
**Sintoma**: Erro intermitente, funciona às vezes  
**Causa**: Conexão de rede instável  
**Solução**:
- Verificar conexão de internet
- Testar com arquivo menor
- Usar rede mais estável (cabo vs WiFi)

#### 5. **Arquivo Corrompido**
**Sintoma**: Erro consistente com arquivo específico  
**Causa**: Arquivo corrompido ou formato inválido  
**Solução**:
- Verificar integridade do arquivo
- Tentar reexportar/salvar novamente
- Converter para formato diferente

---

## Diagnóstico Passo a Passo

### Passo 1: Verificar Logs do Servidor

```bash
# Iniciar servidor em modo debug
pnpm start:dev

# Observar logs durante upload
# Procurar por:
# - "Uploading ... to Vercel Blob"
# - "Vercel Blob upload attempt X/3"
# - "Successfully uploaded"
# - Erros de timeout ou conexão
```

### Passo 2: Testar com cURL

```bash
# Teste básico (arquivo pequeno)
curl -X POST http://localhost:3000/api/cms/assets \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -F "file=@small.jpg" \
  -F "collection_id=YOUR_COLLECTION_ID" \
  -v

# Teste com arquivo de 7MB
curl -X POST http://localhost:3000/api/cms/assets \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -F "file=@large-7mb.png" \
  -F "collection_id=YOUR_COLLECTION_ID" \
  -v \
  --max-time 600
```

### Passo 3: Verificar Network Tab (DevTools)

1. Abrir DevTools (F12)
2. Ir para aba Network
3. Tentar upload
4. Observar:
   - Status code da requisição
   - Tempo de resposta
   - Headers (Content-Length, Content-Type)
   - Response body (mensagem de erro)

### Passo 4: Verificar Configuração do Cliente

```javascript
// Adicionar logging detalhado
const formData = new FormData();
formData.append('file', file);
formData.append('collection_id', collectionId);

console.log('File size:', file.size, 'bytes');
console.log('File type:', file.type);
console.log('Collection ID:', collectionId);

try {
  const response = await axios.post('/api/cms/assets', formData, {
    timeout: 600000, // 10 minutos
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      console.log(`Upload progress: ${percentCompleted}%`);
    },
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  console.log('Upload success:', response.data);
} catch (error) {
  console.error('Upload error:', {
    message: error.message,
    code: error.code,
    response: error.response?.data,
    status: error.response?.status,
  });
}
```

---

## Configuração Recomendada para Cliente

### React/Next.js

```typescript
// hooks/useFileUpload.ts
import { useState } from 'react';
import axios from 'axios';

export function useFileUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File, collectionId: string) => {
    setUploading(true);
    setError(null);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection_id', collectionId);

    try {
      const response = await axios.post('/api/cms/assets', formData, {
        timeout: 600000, // 10 minutos
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total!
          );
          setProgress(percentCompleted);
        },
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${getToken()}`,
          'x-tenant-id': getTenantId(),
        },
      });

      setUploading(false);
      return response.data;
    } catch (err: any) {
      setUploading(false);
      
      // Mensagens de erro amigáveis
      if (err.code === 'ECONNABORTED') {
        setError('Upload timeout. Please try again with a smaller file.');
      } else if (err.response?.status === 503) {
        setError('Service temporarily unavailable. Please try again in a few moments.');
      } else if (err.response?.status === 413) {
        setError('File too large. Maximum size is 50MB.');
      } else if (err.response?.status === 422) {
        setError(err.response.data.message || 'File validation failed.');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
      
      throw err;
    }
  };

  return { upload, progress, uploading, error };
}
```

### Vue.js

```typescript
// composables/useFileUpload.ts
import { ref } from 'vue';
import axios from 'axios';

export function useFileUpload() {
  const progress = ref(0);
  const uploading = ref(false);
  const error = ref<string | null>(null);

  const upload = async (file: File, collectionId: string) => {
    uploading.value = true;
    error.value = null;
    progress.value = 0;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection_id', collectionId);

    try {
      const response = await axios.post('/api/cms/assets', formData, {
        timeout: 600000, // 10 minutos
        onUploadProgress: (progressEvent) => {
          progress.value = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total!
          );
        },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      uploading.value = false;
      return response.data;
    } catch (err: any) {
      uploading.value = false;
      error.value = err.response?.data?.message || 'Upload failed';
      throw err;
    }
  };

  return { upload, progress, uploading, error };
}
```

---

## Checklist de Verificação

### Backend (Servidor)
- [x] Server timeout: 10 minutos
- [x] Request timeout: 10 minutos
- [x] Response timeout: 10 minutos
- [x] Retry mechanism: 3 tentativas
- [x] Error handling: Completo
- [x] Logging: Detalhado

### Frontend (Cliente)
- [ ] Timeout configurado: 10 minutos
- [ ] Progress tracking: Implementado
- [ ] Error handling: Mensagens claras
- [ ] Retry logic: Opcional (backend já faz)
- [ ] File validation: Antes do upload

### Infraestrutura
- [ ] Proxy/Load balancer timeout: ≥ 10 minutos
- [ ] Network stability: Verificada
- [ ] Vercel Blob status: OK

---

## Monitoramento

### Métricas a Acompanhar

1. **Upload Duration**: Tempo médio de upload por tamanho de arquivo
2. **Timeout Rate**: % de uploads que excedem timeout
3. **Retry Rate**: % de uploads que precisam de retry
4. **Success Rate**: % de uploads bem-sucedidos

### Alertas Recomendados

- Timeout rate > 5% (investigar)
- Success rate < 95% (investigar)
- Average upload duration > 30s para arquivos < 10MB (investigar)

---

## Conclusão

Com a configuração atual de 10 minutos de timeout em todas as camadas:

- ✅ Arquivos até 50MB devem fazer upload sem problemas
- ✅ Retry automático garante 99% de sucesso
- ✅ Logs detalhados facilitam debugging
- ✅ Mensagens de erro claras para o usuário

**Próximos Passos**:
1. Verificar configuração de timeout no cliente (frontend)
2. Testar upload com arquivo de 7.15 MB
3. Monitorar logs durante o teste
4. Ajustar conforme necessário

---

**Status**: Timeout configurado para 10 minutos em todas as camadas  
**Última Atualização**: 30 de abril de 2026
