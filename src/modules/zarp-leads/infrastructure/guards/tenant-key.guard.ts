import { CanActivate, ExecutionContext, Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { LEAD_COLLECTION_REPOSITORY, ILeadCollectionRepository } from '../../domain/interfaces/lead-collection.repository.interface';
import * as crypto from 'crypto';

@Injectable()
export class TenantKeyGuard implements CanActivate {
  constructor(
    @Inject(LEAD_COLLECTION_REPOSITORY)
    private readonly collectionRepository: ILeadCollectionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantKey = request.headers['x-tenant-key'];

    if (!tenantKey) {
      throw new UnauthorizedException('Missing tenant key');
    }

    const hash = crypto.createHash('sha256').update(tenantKey as string).digest('hex');
    const collection = await this.collectionRepository.findBySecretKey(hash);

    if (!collection) {
      throw new UnauthorizedException('Invalid tenant key');
    }

    request.tenantContext = {
      tenantId: collection.tenantId,
      collectionId: collection.id,
    };

    return true;
  }
}
