export default class ModelException implements Error {
    public name: string;
    public message: string;
    public cause: string;

    constructor(message, cause) {
        this.name = 'ModelException';
        this.message = message;
        this.cause = cause;
    }
}