import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'is_public';

/**
 * Marca uma rota/controller como intencionalmente pública (postura
 * deny-by-default, Task 7 deste plano). Usar SÓ para rotas que precisam ser
 * alcançáveis sem nenhuma autenticação: webhooks (assinatura verificada),
 * catálogos públicos, pontos de entrada de auth (login/registro).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
