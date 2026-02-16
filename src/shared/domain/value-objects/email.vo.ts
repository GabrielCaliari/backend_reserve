export default class Email {
  private readonly email: string;

  constructor(email: string) {
    this.email = email;
  }

  public toString(): string {
    return this.email;
  }
}
