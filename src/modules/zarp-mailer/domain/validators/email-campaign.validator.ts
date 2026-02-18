import { ICreateEmailCampaign } from '../enums/email-campaign.enum';

export function isEmailCampaignDataValidToCreate(data: ICreateEmailCampaign): ICreateEmailCampaign {
  const { name, smtp_server_id } = data;

  if (!name || !smtp_server_id) {
    throw new Error('Name and smtp_server_id are required');
  }

  if (typeof name !== 'string' || typeof smtp_server_id !== 'number') {
    throw new Error('Name must be a string and smtp_server_id must be a number');
  }

  return { ...data };
}
