export default class ProviderException implements Error {
    public name: string;
    public message: string;
    public cause: string;

    constructor(message, cause) {
        this.name = 'ProviderException';
        this.message = message;
        this.cause = cause;
    }
}