import { DomainException } from '@/shared/exceptions';

/**
 * Value Object for Email Address
 * Ensures email is always valid
 */
export class EmailAddress {
  private readonly value: string;

  constructor(email: string) {
    this.validate(email);
    this.value = email.toLowerCase().trim();
  }

  private validate(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new DomainException(`Invalid email address: ${email}`, 'INVALID_EMAIL');
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: EmailAddress): boolean {
    return this.value === other.value;
  }
}
