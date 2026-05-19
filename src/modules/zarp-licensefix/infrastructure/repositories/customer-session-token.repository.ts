import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { HashProvider } from '../../../../shared/providers/hash.provider';
import { JwtProvider } from '../../../../shared/providers/jwt.provider';

@Injectable()
export class CustomerSessionTokenRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashProvider: HashProvider,
    private readonly jwtProvider: JwtProvider,
  ) {}

  async validateToken(sessionId: string, token: string): Promise<{ customer_id: string; tenant_id: string } | false> {
    const session = await this.prisma.customerSessionToken.findUnique({
      where: { id: sessionId },
      include: {
        Customer: {
          include: { Credential: true },
        },
      },
    });

    if (!session) return false;

    const tokenIsEqual = this.hashProvider.compare(token, session.salt, session.hash_token);
    if (!tokenIsEqual) return false;

    const { expired, payload } = await this.jwtProvider.validate(token, session.Customer.Credential.salt);

    if (expired || !payload?.id) return false;

    if (payload.id !== session.customer_id || payload.id !== session.Customer.id) return false;

    return {
      customer_id: session.Customer.id,
      tenant_id: session.Customer.tenant_id,
    };
  }
}
