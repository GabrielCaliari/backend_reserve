import { IsInt, IsNotEmpty, IsNumberString } from "class-validator";

export default class ExportValidator {
    @IsInt()
    @IsNotEmpty()
    start: number;
}