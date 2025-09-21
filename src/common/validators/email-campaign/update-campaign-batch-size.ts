import { IsNumber, IsPositive, Min } from "class-validator";

export default class UpdateCampaignBatchSizeDTO {
    @IsNumber()
    @IsPositive()
    @Min(100)
    campaign_batch_size: number;
}