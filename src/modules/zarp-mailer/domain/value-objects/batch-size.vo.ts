import { DomainException } from '../../../../shared/exceptions';

/**
 * Value Object for Campaign Batch Size
 * Ensures batch size is always valid (min 100)
 */
export class BatchSize {
  private readonly value: number;
  private static readonly MIN_SIZE = 100;

  constructor(size: number) {
    this.validate(size);
    this.value = size;
  }

  private validate(size: number): void {
    if (!Number.isInteger(size) || size < BatchSize.MIN_SIZE) {
      throw new DomainException(
        `Batch size must be at least ${BatchSize.MIN_SIZE}`,
        'INVALID_BATCH_SIZE',
      );
    }
  }

  getValue(): number {
    return this.value;
  }

  equals(other: BatchSize): boolean {
    return this.value === other.value;
  }
}
