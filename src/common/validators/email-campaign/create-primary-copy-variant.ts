import { IsBoolean, IsOptional, IsString } from "class-validator";
import { NoXSS } from "./cross-script.validator";

export default class CreatePrimaryCopyVariantDTO {
    @IsString()
    @NoXSS({ message: 'HTML contém possíveis scripts maliciosos (XSS)' })
    html: string;

    @IsString()
    @NoXSS({ message: 'Markdown contém possíveis scripts maliciosos (XSS)' })
    md: string;

    @IsString()
    subject: string;

    @IsString()
    from_name: string;

    @IsString()
    @IsOptional()
    pre_header: string;

    @IsBoolean()
    use_header: boolean;

    @IsBoolean()
    use_footer: boolean;
}