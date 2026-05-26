import { CanActivate, ExecutionContext, Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { LEAD_COLLECTION_REPOSITORY, ILeadCollectionRepository } from '../../domain/interfaces/lead-collection.repository.interface';
import { InvalidCollectionSecretKeyException } from '../../domain/errors/invalid-collection-secret-key.error';
import * as crypto from 'crypto';

@Injectable()
export class CollectionSecretKeyGuard implements CanActivate {
  constructor(
    @Inject(LEAD_COLLECTION_REPOSITORY)
    private readonly collectionRepository: ILeadCollectionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const secretKey = request.headers['x-collection-secret-key'];

    if (!secretKey) {
      throw new UnauthorizedException('Missing x-collection-secret-key header');
    }

    const hash = crypto.createHash('sha256').update(secretKey as string).digest('hex');

    const collection = await this.collectionRepository.findBySecretKey(hash);

    if (!collection || !collection.active) {
      throw new InvalidCollectionSecretKeyException();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { secretKeyHash: _h, secretKeySalt: _s, ...rest } = collection;
    request.collection = rest;

    return true;
  }
}
