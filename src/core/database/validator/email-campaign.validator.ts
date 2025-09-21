import { IsString, IsNotEmpty, IsNumber } from "class-validator";
import { ICreateEmailCampaign } from "src/@types/@Email-campaign";

export function isEmailCampaignDataValidToCreate(data: ICreateEmailCampaign): ICreateEmailCampaign {
    const { name, smtp_server_id } = data;

    if (!name || !smtp_server_id) {
        throw new Error('Name and smtp_server_id are required');
    }

    if (typeof name !== 'string' || typeof smtp_server_id !== 'number') {
        throw new Error('Name must be a string and smtp_server_id must be a number');
    }

    return {
        ...data
    }
}

