import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ValidateCouponUseCase } from '../../application/use-cases/validate-coupon.use-case';
import { ValidateCouponDTO } from '../../application/dtos/validate-coupon.dto';

@ApiTags('Public Coupons')
@Controller('public/coupons')
export class PublicCouponsController {
  constructor(private readonly validateCouponUseCase: ValidateCouponUseCase) {}

  private getTenantId(tenantId: string): string {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return tenantId;
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
