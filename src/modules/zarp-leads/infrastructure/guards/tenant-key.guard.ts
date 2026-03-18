import { CanActivate, ExecutionContext, Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { LEAD_COLLECTION_REPOSITORY, ILeadCollectionRepository } from '../../domain/interfaces/lead-collection.repository.interface';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TenantKeyGuard implements CanActivate {
  constructor(
    @Inject(LEAD_COLLECTION_REPOSITORY)
    private readonly collectionRepository: ILeadCollectionRepository,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantKey = request.headers['x-tenant-key'];

    if (!tenantKey) {
      throw new UnauthorizedException('Missing tenant key');
    }

    // Get all active collections to check against
    const { collections } = await this.collectionRepository.findAll({ active: true });

    // Try to match the tenant key against each collection's hash
    const privateKey = this.configService.get<string>('ENCRYPT_PRIVATE_KEY');
    if (!privateKey) {
      throw new Error('ENCRYPT_PRIVATE_KEY not configured');
    }

    for (const collection of collections) {
      if (!collection.secretKeyHash) {
        continue;
      }

      let isMatch = false;

      // Try PBKDF2-SHA512 (new format with salt)
      if (collection.secretKeySalt) {
        const hashPBKDF2 = crypto
          .pbkdf2Sync(tenantKey as string, collection.secretKeySalt + privateKey, 856, 64, 'sha512')
          .toString('hex');
        
        if (hashPBKDF2 === collection.secretKeyHash) {
          isMatch = true;
        }
      }

      // Fallback to SHA-256 (legacy format without salt) for backward compatibility
      if (!isMatch) {
        const hashSHA256 = crypto
          .createHash('sha256')
          .update(tenantKey as string)
          .digest('hex');
        
        if (hashSHA256 === collection.secretKeyHash) {
          isMatch = true;
        }
      }

      if (isMatch) {
        // Match found
        request.tenantContext = {
          tenantId: collection.tenantId,
          collectionId: collection.id,
        };
        return true;
      }
    }

    throw new UnauthorizedException('Invalid tenant key');
  }
}
