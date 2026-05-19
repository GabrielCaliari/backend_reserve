import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { HashProvider } from '../../../../shared/providers/hash.provider';
import {
  IActivationTokenRepository,
  ACTIVATION_TOKEN_REPOSITORY,
} from '../../domain/interfaces/activation-token.repository.interface';
import { ETokenType } from '../../domain/enums/token-type.enum';

@Injectable()
export class ActivateAccountUseCase {
  private readonly logger = new Logger(ActivateAccountUseCase.name);

  constructor(
    @Inject(ACTIVATION_TOKEN_REPOSITORY)
    private readonly tokenRepo: IActivationTokenRepository,
    private readonly prisma: PrismaService,
    private readonly hashProvider: HashProvider,
  ) {}

  async execute(token: string, password: string): Promise<void> {
    const record = await this.tokenRepo.findByToken(token);

    if (!record || record.type !== ETokenType.ACTIVATION) {
      this.logger.warn(`Activation attempt with invalid token`);
      throw new BadRequestException('Token inválido.');
    }

    if (record.used_at) {
      this.logger.warn(`Activation attempt with already-used token: ${record.id}`);
      throw new BadRequestException('Token já utilizado.');
    }

    if (new Date() > record.expires_at) {
      this.logger.warn(`Activation attempt with expired token: ${record.id}`);
      throw new BadRequestException('Token expirado.');
    }

    const { hash, salt } = this.hashProvider.hash(password);

    // Atomic: upsert CustomerCredential + mark token used
    await this.prisma.$transaction(async (tx) => {
      await tx.customerCredential.upsert({
        where: { customer_id: record.customer_id },
        update: { hash, salt },
        create: { customer_id: record.customer_id, hash, salt },
      });

      await tx.activationToken.update({
        where: { id: record.id },
        data: { used_at: new Date() },
      });
    });

    this.logger.log(`Account activated: customer=${record.customer_id}, tenant=${record.tenant_id}, token=${record.id}`);
  }
}
