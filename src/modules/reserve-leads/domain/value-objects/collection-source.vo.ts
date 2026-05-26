export class CollectionSource {
  constructor(
    public readonly type: string,
    public readonly channel?: string,
    public readonly campaign?: string
  ) {
    if (!type || type.trim().length === 0) {
      throw new Error('Source type is required');
    }
  }

  toString(): string {
    const parts = [this.type];
    if (this.channel) parts.push(this.channel);
    if (this.campaign) parts.push(this.campaign);
    return parts.join('/');
  }

  equals(other: CollectionSource): boolean {
    return (
      this.type === other.type &&
      this.channel === other.channel &&
      this.campaign === other.campaign
    );
  }

  static fromString(source: string): CollectionSource {
    const parts = source.split('/');
    return new CollectionSource(parts[0], parts[1], parts[2]);
  }
}
