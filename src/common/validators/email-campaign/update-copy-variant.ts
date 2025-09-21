import { ECopyVariationType } from "src/@types/@Email-campaign";
import { IsEnum } from "class-validator";

export default class UpdateCopyVariantDTO {
    @IsEnum(ECopyVariationType)
    copy_variation_type: ECopyVariationType;
}
    
