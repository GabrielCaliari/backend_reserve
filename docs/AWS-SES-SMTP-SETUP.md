# AWS SES SMTP Setup Guide

## Overview

Amazon SES (Simple Email Service) é o serviço de email da AWS que permite enviar emails transacionais e marketing com alta deliverability e baixo custo.

## Vantagens do AWS SES

| Característica | Benefício |
|----------------|-----------|
| **Custo** | $0.10 por 1.000 emails (muito mais barato que SendGrid, Mailgun) |
| **Deliverability** | Alta taxa de entrega (reputação da AWS) |
| **Escalabilidade** | Até 50.000 emails/dia (sandbox) ou ilimitado (produção) |
| **Integração** | Fácil integração com outros serviços AWS |
| **Monitoramento** | CloudWatch metrics, bounce/complaint tracking |

## Pré-requisitos

- Conta AWS ativa
- Domínio próprio (para produção)
- Acesso ao DNS do domínio

## Passo 1: Criar Conta AWS

Se ainda não tem:

1. Acesse https://aws.amazon.com/
2. Clique em "Create an AWS Account"
3. Preencha os dados (cartão de crédito necessário)
4. Ative a conta

**Custo**: Free tier inclui 62.000 emails/mês grátis (se enviar de EC2)

## Passo 2: Verificar Email ou Domínio

### Opção A: Verificar Email Individual (Sandbox - Teste)

**Quando usar**: Desenvolvimento, testes, POC

1. Acesse o Console AWS: https://console.aws.amazon.com/ses/
2. Selecione a região (ex: us-east-1)
3. No menu lateral, clique em **"Verified identities"**
4. Clique em **"Create identity"**
5. Selecione **"Email address"**
6. Digite seu email (ex: `seu-email@gmail.com`)
7. Clique em **"Create identity"**
8. Verifique sua caixa de entrada
9. Clique no link de verificação

**Limitações no Sandbox**:
- Só pode enviar para emails verificados
- Limite de 200 emails/dia
- Limite de 1 email/segundo

### Opção B: Verificar Domínio (Produção)

**Quando usar**: Produção, envio em massa

1. Acesse **"Verified identities"**
2. Clique em **"Create identity"**
3. Selecione **"Domain"**
4. Digite seu domínio (ex: `seudominio.com`)
5. Marque **"Generate DKIM settings"** (recomendado)
6. Clique em **"Create identity"**

7. **Configure DNS Records**:

AWS fornecerá 3 tipos de registros DNS:

#### a) Registro TXT (Verificação do Domínio)
```
Type: TXT
Name: _amazonses.seudominio.com
Value: [código fornecido pela AWS]
TTL: 1800
```

#### b) Registros CNAME (DKIM - 3 registros)
```
Type: CNAME
Name: [hash1]._domainkey.seudominio.com
Value: [hash1].dkim.amazonses.com
TTL: 1800

Type: CNAME
Name: [hash2]._domainkey.seudominio.com
Value: [hash2].dkim.amazonses.com
TTL: 1800

Type: CNAME
Name: [hash3]._domainkey.seudominio.com
Value: [hash3].dkim.amazonses.com
TTL: 1800
```

#### c) Registro MX (Recebimento - Opcional)
```
Type: MX
Name: seudominio.com
Value: 10 inbound-smtp.us-east-1.amazonaws.com
TTL: 1800
```

8. **Aguarde Verificação**: Pode levar até 72 horas (geralmente 15-30 minutos)

## Passo 3: Sair do Sandbox (Produção)

**Importante**: No sandbox, você só pode enviar para emails verificados.

### Solicitar Saída do Sandbox

1. No console SES, clique em **"Account dashboard"**
2. Clique em **"Request production access"**
3. Preencha o formulário:

**Informações necessárias**:
- **Mail type**: Transactional (emails transacionais) ou Marketing
- **Website URL**: URL do seu site
- **Use case description**: Descreva como vai usar (ex: "Envio de notificações de pedidos, confirmações de cadastro, recuperação de senha")
- **Compliance**: Como vai lidar com bounces e complaints
- **Opt-out process**: Como usuários podem cancelar inscrição (se marketing)

**Exemplo de descrição**:
```
Usaremos o SES para enviar emails transacionais da nossa plataforma SaaS:
- Confirmação de cadastro
- Recuperação de senha
- Notificações de atividade
- Alertas do sistema

Implementamos:
- Bounce e complaint handling automático
- Unsubscribe link em todos os emails de marketing
- Double opt-in para newsletters
- Monitoramento de métricas de deliverability
```

4. Clique em **"Submit request"**
5. Aguarde aprovação (geralmente 24-48 horas)

## Passo 4: Criar Credenciais SMTP

1. No console SES, vá em **"Account dashboard"**
2. No menu lateral, clique em **"SMTP settings"**
3. Clique em **"Create SMTP credentials"**
4. Digite um nome (ex: `reserve-smtp-credentials`)
5. Clique em **"Create user"**
6. **IMPORTANTE**: Baixe ou copie as credenciais:
   - **SMTP Username**: `AKIAIOSFODNN7EXAMPLE`
   - **SMTP Password**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

**⚠️ ATENÇÃO**: A senha só é mostrada uma vez! Salve em local seguro.

## Passo 5: Configurar Aplicação

### Informações SMTP por Região

| Região | Endpoint SMTP | Porta |
|--------|---------------|-------|
| **US East (N. Virginia)** | `email-smtp.us-east-1.amazonaws.com` | 587 (TLS) ou 465 (SSL) |
| **US West (Oregon)** | `email-smtp.us-west-2.amazonaws.com` | 587 (TLS) ou 465 (SSL) |
| **EU (Ireland)** | `email-smtp.eu-west-1.amazonaws.com` | 587 (TLS) ou 465 (SSL) |
| **Asia Pacific (Sydney)** | `email-smtp.ap-southeast-2.amazonaws.com` | 587 (TLS) ou 465 (SSL) |
| **South America (São Paulo)** | `email-smtp.sa-east-1.amazonaws.com` | 587 (TLS) ou 465 (SSL) |

**Recomendação**: Use **us-east-1** (N. Virginia) - região mais estável e barata

### Variáveis de Ambiente

Adicione ao seu `.env`:

```bash
# AWS SES SMTP Configuration
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false  # false para TLS (porta 587), true para SSL (porta 465)
SMTP_USER=AKIAIOSFODNN7EXAMPLE
SMTP_PASSWORD=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
SMTP_FROM_EMAIL=noreply@seudominio.com
SMTP_FROM_NAME=Seu App
```

### Configuração no Código (Nodemailer)

```typescript
import * as nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // false para TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Enviar email
await transporter.sendMail({
  from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
  to: 'destinatario@example.com',
  subject: 'Teste AWS SES',
  html: '<h1>Email enviado via AWS SES!</h1>',
});
```

## Passo 6: Testar Envio

### Teste via Nodemailer (Node.js)

```typescript
// test-ses.ts
import * as nodemailer from 'nodemailer';

async function testSES() {
  const transporter = nodemailer.createTransport({
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    secure: false,
    auth: {
      user: 'SEU_SMTP_USER',
      pass: 'SEU_SMTP_PASSWORD',
    },
  });

  try {
    const info = await transporter.sendMail({
      from: '"Teste" <noreply@seudominio.com>',
      to: 'seu-email@gmail.com',
      subject: 'Teste AWS SES',
      html: '<h1>Funcionou!</h1><p>Email enviado via AWS SES</p>',
    });

    console.log('✓ Email enviado:', info.messageId);
  } catch (error) {
    console.error('✗ Erro ao enviar:', error);
  }
}

testSES();
```

Execute:
```bash
pnpm exec ts-node test-ses.ts
```

### Teste via AWS CLI

```bash
aws ses send-email \
  --from noreply@seudominio.com \
  --destination ToAddresses=seu-email@gmail.com \
  --message Subject={Data="Teste SES",Charset=utf8},Body={Text={Data="Teste via CLI",Charset=utf8}} \
  --region us-east-1
```

## Passo 7: Configurar Bounce e Complaint Handling

### Por que é importante?

- **Bounces**: Emails que não foram entregues (email inválido, caixa cheia)
- **Complaints**: Usuários marcaram como spam
- **Alta taxa de bounce/complaint**: AWS pode suspender sua conta

### Configurar SNS para Notificações

1. Acesse **SNS Console**: https://console.aws.amazon.com/sns/
2. Crie um tópico:
   - Nome: `ses-bounces`
   - Tipo: Standard
3. Crie uma subscription:
   - Protocol: Email ou HTTPS
   - Endpoint: seu-email@example.com ou webhook URL

4. No SES Console, vá em **"Verified identities"**
5. Selecione seu domínio
6. Clique em **"Notifications"**
7. Configure:
   - **Bounces**: Selecione o tópico SNS `ses-bounces`
   - **Complaints**: Selecione o tópico SNS `ses-bounces`
   - **Deliveries**: (opcional)

### Implementar Webhook (Recomendado)

```typescript
// src/modules/reserve-mailer/infrastructure/controllers/ses-webhook.controller.ts
@Controller('webhooks/ses')
export class SesWebhookController {
  @Post('notifications')
  async handleNotification(@Body() body: any) {
    const message = JSON.parse(body.Message);
    
    if (message.notificationType === 'Bounce') {
      // Marcar email como inválido no banco
      await this.markEmailAsBounced(message.bounce.bouncedRecipients);
    }
    
    if (message.notificationType === 'Complaint') {
      // Remover email da lista (usuário marcou como spam)
      await this.unsubscribeEmail(message.complaint.complainedRecipients);
    }
    
    return { status: 'ok' };
  }
}
```

## Passo 8: Monitoramento

### CloudWatch Metrics

1. Acesse **CloudWatch Console**
2. Vá em **"Metrics"** → **"SES"**
3. Monitore:
   - **Send**: Emails enviados
   - **Delivery**: Emails entregues
   - **Bounce**: Emails rejeitados
   - **Complaint**: Marcados como spam
   - **Reject**: Rejeitados pelo SES

### Criar Alarmes

```bash
# Alarme para alta taxa de bounce
aws cloudwatch put-metric-alarm \
  --alarm-name ses-high-bounce-rate \
  --alarm-description "Bounce rate acima de 5%" \
  --metric-name Reputation.BounceRate \
  --namespace AWS/SES \
  --statistic Average \
  --period 300 \
  --threshold 0.05 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

## Custos

### Preços AWS SES (2026)

| Item | Custo |
|------|-------|
| **Emails enviados** | $0.10 por 1.000 emails |
| **Emails recebidos** | $0.10 por 1.000 emails |
| **Anexos** | $0.12 por GB |
| **Dedicated IP** | $24.95/mês por IP |

### Comparação com Concorrentes

| Serviço | Custo por 1.000 emails |
|---------|------------------------|
| **AWS SES** | $0.10 |
| SendGrid | $0.30 - $1.00 |
| Mailgun | $0.80 |
| Postmark | $1.25 |
| Mailchimp | $1.50+ |

### Exemplo de Custo Mensal

| Volume | Custo AWS SES |
|--------|---------------|
| 10.000 emails/mês | $1.00 |
| 50.000 emails/mês | $5.00 |
| 100.000 emails/mês | $10.00 |
| 1.000.000 emails/mês | $100.00 |

## Limites

### Sandbox (Desenvolvimento)

- 200 emails/dia
- 1 email/segundo
- Só pode enviar para emails verificados

### Produção (Após aprovação)

- 50.000 emails/dia (inicial)
- 14 emails/segundo (inicial)
- Pode enviar para qualquer email
- Limites aumentam automaticamente com uso

### Solicitar Aumento de Limite

1. Acesse **SES Console** → **"Account dashboard"**
2. Clique em **"Request a sending quota increase"**
3. Preencha:
   - **Limit type**: SES Sending Quota
   - **New limit value**: Quantidade desejada
   - **Use case description**: Justificativa

## Troubleshooting

### Erro: "Email address is not verified"

**Causa**: Ainda está no sandbox  
**Solução**: Solicite saída do sandbox ou verifique o email de destino

### Erro: "Daily sending quota exceeded"

**Causa**: Atingiu limite diário  
**Solução**: Aguarde 24h ou solicite aumento de limite

### Erro: "Maximum sending rate exceeded"

**Causa**: Enviando muito rápido  
**Solução**: Implemente rate limiting ou solicite aumento

### Emails indo para spam

**Causas**:
- DKIM não configurado
- SPF não configurado
- Conteúdo suspeito
- Alta taxa de bounce/complaint

**Soluções**:
1. Configure DKIM (registros DNS)
2. Configure SPF:
```
Type: TXT
Name: seudominio.com
Value: v=spf1 include:amazonses.com ~all
```
3. Configure DMARC:
```
Type: TXT
Name: _dmarc.seudominio.com
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@seudominio.com
```
4. Use templates profissionais
5. Implemente double opt-in
6. Monitore métricas

## Checklist de Configuração

- [ ] Criar conta AWS
- [ ] Verificar email ou domínio
- [ ] Configurar registros DNS (TXT, CNAME, SPF, DMARC)
- [ ] Solicitar saída do sandbox (produção)
- [ ] Criar credenciais SMTP
- [ ] Configurar variáveis de ambiente
- [ ] Testar envio de email
- [ ] Configurar bounce/complaint handling
- [ ] Configurar monitoramento CloudWatch
- [ ] Criar alarmes
- [ ] Documentar credenciais (local seguro)

## Recursos Adicionais

- **Documentação AWS SES**: https://docs.aws.amazon.com/ses/
- **Calculadora de Preços**: https://calculator.aws/
- **Status AWS**: https://status.aws.amazon.com/
- **Fórum AWS**: https://forums.aws.amazon.com/forum.jspa?forumID=90
- **Guia de Deliverability**: https://docs.aws.amazon.com/ses/latest/dg/send-email-best-practices.html

## Próximos Passos

1. Configure AWS SES seguindo este guia
2. Teste envio de emails
3. Integre com o módulo `reserve-mailer`
4. Configure bounce/complaint handling
5. Monitore métricas de deliverability
6. Otimize templates de email
