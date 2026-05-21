import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { HashProvider } from '../../../../shared/providers/hash.provider';
import { JwtProvider } from '../../../../shared/providers/jwt.provider';

@Injectable()
export class LoginCustomerUseCase {
  private readonly logger = new Logger(LoginCustomerUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashProvider: HashProvider,
    private readonly jwtProvider: JwtProvider,
  ) {}

  async execute(tenantId: string, email: string, password: string) {
    // Lookup is tenant-scoped: same email can exist in different tenants
    const customer = await this.prisma.customer.findUnique({
      where: { tenant_id_email: { tenant_id: tenantId, email } },
      include: { Credential: true },
    });

    if (!customer || !customer.Credential) {
      // Don't reveal whether customer exists or not
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const valid = this.hashProvider.compare(password, customer.Credential.salt, customer.Credential.hash);

    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    // Validate active product access: check B2C UserProductAccess OR completed B2B digital purchase
    const [access, b2bPurchase] = await Promise.all([
      this.prisma.userProductAccess.findFirst({
        where: {
          customer_id: customer.id,
          tenant_id: tenantId,
          status: { in: ['active', 'trialing'] },
        },
        select: { id: true, product_id: true, access_type: true, status: true, access_expires_at: true },
      }),
      this.prisma.b2BPurchase.findFirst({
        where: {
          customer_email: customer.email,
          tenant_id: tenantId,
          status: 'completed',
          product: { requires_shipping: false },
        },
        select: { id: true, product_id: true },
      }),
    ]);

    if (!access && !b2bPurchase) {
      this.logger.warn(`Login: customer ${customer.id} has no active access in tenant ${tenantId}`);
      throw new UnauthorizedException('Sem acesso ativo para este portal.');
    }

    // Generate JWT using same pattern as existing user auth (JwtProvider + salt)
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const token = await this.jwtProvider.generate(
      { id: customer.id, email: customer.email, name: customer.name, tenant_id: tenantId, role: customer.role },
      SEVEN_DAYS_MS,
      customer.Credential.salt,
    );

    const { hash, salt } = this.hashProvider.hash(token);

    const session = await this.prisma.customerSessionToken.create({
      data: { customer_id: customer.id, hash_token: hash, salt },
    });

    this.logger.log(`Customer logged in: customer=${customer.id}, tenant=${tenantId}, session=${session.id}`);

    return {
      token,
      session_id: session.id,
      details: {
        name: customer.name,
        email: customer.email,
        tenant_id: tenantId,
        role: customer.role,
      },
      access: access
        ? {
            product_id: access.product_id,
            access_type: access.access_type,
            status: access.status,
            access_expires_at: access.access_expires_at,
          }
        : {
            product_id: b2bPurchase!.product_id,
            access_type: 'lifetime',
            status: 'active',
            access_expires_at: null,
          },
    };
  }
}
