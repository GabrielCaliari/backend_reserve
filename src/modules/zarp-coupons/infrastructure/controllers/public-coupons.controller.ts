import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ValidateCouponUseCase } from '../../application/use-cases/validate-coupon.use-case';
import { ResolveCouponUseCase } from '../../application/use-cases/resolve-coupon.use-case';
import { ValidateCouponDTO } from '../../application/dtos/validate-coupon.dto';

@ApiTags('Public Coupons')
@Controller('public/coupons')
export class PublicCouponsController {
  constructor(
    private readonly validateCouponUseCase: ValidateCouponUseCase,
    private readonly resolveCouponUseCase: ResolveCouponUseCase,
  ) {}

  private getTenantId(tenantId: string): string {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return tenantId;
  }

  @Get('resolve')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Resolver cupom pelo código (para pré-carregar no carrinho via link)',
    description:
      'Retorna os dados públicos de um cupom a partir do código. ' +
      'Usado pelo site final quando o usuário acessa um link com ?code=CODIGO. ' +
      'Limitado a 20 requisições por minuto por IP.',
  })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
  @ApiQuery({ name: 'code', required: true, description: 'Código do cupom (ex: PROMO10)' })
  @ApiResponse({
    status: 200,
    description: 'Dados públicos do cupom',
    schema: {
      example: {
        code: 'PROMO10',
        name: '10% de desconto',
        description: 'Válido até o final do mês',
        discountType: 'percentage',
        discountValue: 10,
        scope: 'order',
        appliesTo: 'both',
        expiresAt: '2026-12-31T23:59:59.000Z',
        valid: true,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cupom não encontrado ou inativo' })
  async resolve(
    @Headers('x-tenant-id') tenantId: string,
    @Query('code') code: string,
  ) {
    if (!code) throw new BadRequestException('Query param "code" é obrigatório');
    return this.resolveCouponUseCase.execute(this.getTenantId(tenantId), code);
  }

  @Post('validate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Validar código(s) de cupom contra o carrinho',
    description:
      'Endpoint público para pré-validar cupons antes do checkout. ' +
      'O desconto será sempre recalculado na criação da sessão de checkout. ' +
      'Limitado a 10 requisições por minuto por IP.',
  })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
  @ApiResponse({ status: 201, description: 'Resultado da validação dos cupons' })
  @ApiResponse({ status: 422, description: 'Cupom inválido' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas — aguarde 1 minuto' })
  async validate(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: ValidateCouponDTO,
  ) {
    return this.validateCouponUseCase.execute(
      this.getTenantId(tenantId),
      dto.codes,
      dto.cartItems,
      dto.context,
    );
  }
}
