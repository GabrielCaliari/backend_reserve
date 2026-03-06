import { CanActivate, ExecutionContext, Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { LEAD_COLLECTION_REPOSITORY, ILeadCollectionRepository } from '../../domain/interfaces/lead-collection.repository.interface';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class TenantKeyGuard implements CanActivate {
  constructor(
    @Inject(LEAD_COLLECTION_REPOSITORY)
    private readonly collectionRepository: ILeadCollectionRepository,
    private readonly configService: ConfigService,
  ) {}

  private hashSecretKey(value: string, salt: string): string {
    const privateKey = this.configService.get<string>('ENCRYPT_PRIVATE_KEY');
    if (!privateKey) {
      throw new Error('ENCRYPT_PRIVATE_KEY not configured');
    }
    return crypto
      .pbkdf2Sync(value, salt + privateKey, 856, 64, 'sha512')
      .toString('hex');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantKey = request.headers['x-tenant-key'];

    if (!tenantKey) {
      throw new UnauthorizedException('Missing tenant key');
    }

    // First, we need to find all active collections and check each one
    // because we need the salt to hash the key properly
    const allCollections = await this.collectionRepository.findAll({ active: true });

    let matchedCollection = null;
    for (const collection of allCollections.collections) {
      if (collection.secretKeyHash && collection.secretKeySalt) {
        const hash = this.hashSecretKey(tenantKey as string, collection.secretKeySalt);
        if (hash === collection.secretKeyHash) {
          matchedCollection = collection;
          break;
        }
      }
    }

    if (!matchedCollection) {
      throw new UnauthorizedException('Invalid tenant key');
    }

    request.tenantContext = {
      tenantId: matchedCollection.tenantId,
      collectionId: matchedCollection.id,
    };

    return true;
  }
}
