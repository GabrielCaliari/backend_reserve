export enum ECompanySize {
    small = 1,
    medium = 2,
    large = 3
}

export interface ICreateTrademarkRegistrionLead {
    name: string;
    email: string;
    phone_number: string;
    brand: string;
    description: string;
    company_size: ECompanySize;
    company_segment: string;
    company_on_market: string;
    website?: string;
}