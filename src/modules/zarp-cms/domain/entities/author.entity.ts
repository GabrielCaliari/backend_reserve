/**
 * Author Entity
 * 
 * Represents a content creator with biographical information.
 * Authors are tenant-scoped and can have an optional avatar image.
 */
export class Author {
  public readonly id?: string; // UUID (12-character cuid)
  public firstName: string;
  public lastName: string;
  public biography: string | null;
  public avatarId: string | null; // UUID reference to MediaAsset
  public tenantId: string;
  public active: boolean;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(data: {
    id?: string;
    firstName: string;
    lastName: string;
    biography?: string | null;
    avatarId?: string | null;
    tenantId: string;
    active?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = data.id;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.biography = data.biography ?? null;
    this.avatarId = data.avatarId ?? null;
    this.tenantId = data.tenantId;
    this.active = data.active ?? true;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Returns the author's full name
   * @returns Full name as "FirstName LastName"
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Validates that both first and last names are non-empty
   * @returns true if both names are valid, false otherwise
   */
  validateNames(): boolean {
    return this.firstName.length > 0 && this.lastName.length > 0;
  }
}
