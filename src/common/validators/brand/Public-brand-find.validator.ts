import { IsBoolean, IsEmail, IsNotEmpty, IsString, Matches } from "class-validator";

export default class PublicBrandFindValidator {
    @IsString()
    @IsNotEmpty()
    @Matches(/^[A-Za-zÀ-ÖØ-öø-ÿÁ-úçÇ]{2,}(?: [A-Za-zÀ-ÖØ-öø-ÿÁ-úçÇ]{2,})*$/)
    name: string;

    @IsEmail()
    email: string;

    @IsBoolean()
    radical: boolean;

    @IsBoolean()
    international: boolean;
}