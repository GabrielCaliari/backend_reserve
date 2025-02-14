import { IsNotEmpty, IsString } from "class-validator";

export default class PublicFindBrandValidator {
    @IsString()
    @IsNotEmpty()
    brand_name: string;
}