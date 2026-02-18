import { CanActivate, ExecutionContext, Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { LEAD_COLLECTION_REPOSITORY, ILeadCollectionRepository } from '../../domain/interfaces/lead-collection.repository.interface';
import { InvalidCollectionKeyError } from '../../domain/errors/invalid-collection-key.error';
import * as crypto from 'crypto';

@Injectable()
export class CollectionSecretKeyGuard implements CanActivate {
  constructor(
    @Inject(LEAD_COLLECTION_REPOSITORY)
    private readonly collectionRepository: ILeadCollectionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const secretKey = request.headers['x-collection-key'];

    if (!secretKey) {
      throw new UnauthorizedException('Missing x-collection-key header');
    }

    // Hash the provided key to compare with stored hash
    const hash = crypto.createHash('sha256').update(secretKey as string).digest('hex');

    const collection = await this.collectionRepository.findBySecretKey(hash);

    if (!collection || !collection.active) {
      throw new InvalidCollectionKeyError();
    }

    // Attach collection to request for use in controller
    request.collection = collection;

    return true;
  }
}
