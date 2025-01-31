import { HttpException, HttpStatus } from "@nestjs/common";

export default class CustomControllerException extends HttpException {
    public message: string;
    public cause: string;

    constructor({ message, cause, code }: { message?, cause?, code?}) {
        super({
            code: code
        }, HttpStatus.FORBIDDEN, {
            description: message,
            cause: cause
        });
    }
}