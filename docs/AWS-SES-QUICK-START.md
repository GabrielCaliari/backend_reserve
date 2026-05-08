# AWS SES - Quick Start (5 minutos)

## TL;DR

Configuração rápida do AWS SES para começar a enviar emails.

## Passo 1: Criar Conta AWS (2 min)

1. Acesse: https://aws.amazon.com/
2. Clique em "Create an AWS Account"
3. Preencha dados + cartão de crédito
4. Ative a conta

**Custo**: Free tier = 62.000 emails/mês grátis

## Passo 2: Verificar Email (1 min)

1. Console AWS: https://console.aws.amazon.com/ses/
2. Região: **us-east-1** (N. Virginia)
3. Menu: **"Verified identities"** → **"Create identity"**
4. Tipo: **"Email address"**
5. Email: `seu-email@gmail.com`
6. Verifique inbox e clique no link

## Passo 3: Criar Credenciais SMTP (1 min)

1. Menu: **"SMTP settings"**
2. **"Create SMTP credentials"**
3. Nome: `zarp-smtp`
4. **"Create user"**
5. **COPIE AS CREDENCIAIS** (só aparecem uma vez!)

## Passo 4: Configurar .env (30 seg)

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=AKIAIOSFODNN7EXAMPLE
SMTP_PASSWORD=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
SMTP_FROM_EMAIL=seu-email@gmail.com
SMTP_FROM_NAME=Seu App
```

## Passo 5: Testar (30 seg)

```typescript
// test-ses.ts
import * as nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

await transporter.sendMail({
  from: process.env.SMTP_FROM_EMAIL,
  to: 'seu-email@gmail.com',
  subject: 'Teste AWS SES',
  html: '<h1>Funcionou! 🎉</h1>',
});
```

Execute:
```bash
pnpm exec ts-node test-ses.ts
```

## Limitações (Sandbox)

⚠️ No modo sandbox:
- ✅ 200 emails/dia
- ✅ 1 email/segundo
- ❌ Só pode enviar para emails verificados

## Sair do Sandbox (Produção)

1. Menu: **"Account dashboard"**
2. **"Request production access"**
3. Preencha formulário:
   - **Mail type**: Transactional
   - **Use case**: "Envio de notificações, confirmações, alertas"
4. Aguarde aprovação (24-48h)

Após aprovação:
- ✅ 50.000 emails/dia
- ✅ 14 emails/segundo
- ✅ Enviar para qualquer email

## Custos

| Volume | Custo/mês |
|--------|-----------|
| 10.000 emails | $1.00 |
| 50.000 emails | $5.00 |
| 100.000 emails | $10.00 |

**10x mais barato** que SendGrid, Mailgun, etc.

## Próximos Passos

1. ✅ Configurar domínio próprio (produção)
2. ✅ Configurar DKIM, SPF, DMARC
3. ✅ Implementar bounce/complaint handling
4. ✅ Monitorar métricas

Ver guia completo: `docs/AWS-SES-SMTP-SETUP.md`

## Troubleshooting

**Erro: "Email address is not verified"**  
→ Verifique o email de destino ou saia do sandbox

**Emails indo para spam**  
→ Configure DKIM, SPF e DMARC (ver guia completo)

**Limite diário excedido**  
→ Solicite aumento de limite ou aguarde 24h

## Suporte

- Documentação: https://docs.aws.amazon.com/ses/
- Status: https://status.aws.amazon.com/
- Guia completo: `docs/AWS-SES-SMTP-SETUP.md`
