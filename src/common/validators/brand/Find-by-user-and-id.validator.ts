import { IsInt, IsNotEmpty, IsString } from "class-validator";

export default class FindByUserAndIdValidator {
    @IsString()
    @IsNotEmpty()
    id: string;
}