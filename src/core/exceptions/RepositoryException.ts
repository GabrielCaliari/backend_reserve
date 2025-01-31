export default class RepositoryException implements Error {
    public name: string;
    public message: string;
    public cause: string;

    constructor(message, cause) {
        this.name = 'RepositoryException';
        this.message = message;
        this.cause = cause;
    }
}