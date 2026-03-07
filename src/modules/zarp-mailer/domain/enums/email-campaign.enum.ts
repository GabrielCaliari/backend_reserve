export enum EEmailCampaignStatus {
    draft = 0,
    pending = 1,
    scheduled = 2,
    sent = 3,
    failed = 4,
    archived = 5,
    paused = 8,
}

export interface ICreateEmailCampaign {
    name: string;
    smtp_server_id: string;
}

export enum ECopyVariationType {
    ai = 1,
    manual = 2,
}
