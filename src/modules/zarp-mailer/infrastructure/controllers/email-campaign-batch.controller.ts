import { Controller, Get } from "@nestjs/common";
import { EmailCampaignBatchService } from "../../application/services/email-campaign-batch.service";

@Controller()
export class EmailCampaignBatchController {
    public constructor(
        private readonly emailCampaignBatchService: EmailCampaignBatchService
    ) { }

  
}