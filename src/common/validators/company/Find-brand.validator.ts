import { IsNotEmpty, IsString } from "class-validator";

export default class FindBrandValidator {
    @IsString()
    @IsNotEmpty()
    brand_id: string;
}