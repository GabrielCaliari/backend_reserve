import { IsNotEmpty, IsString } from "class-validator";

export default class AlertsByBrandNameValidator {
    @IsString()
    @IsNotEmpty()
    brand_id: number;
}