export default class Email {
    private email: string;

    constructor(email: string) {
        this.email = email;
    }

    public toString(): string {
        return this.email;
    }
}
