import { IsNotEmpty, IsString } from "class-validator";

export default class SendMessageValidator {
    @IsString()
    @IsNotEmpty()
    brand: string;

    @IsString()
    @IsNotEmpty()
    niche: string;

    @IsString()
    @IsNotEmpty()
    description: string;
}