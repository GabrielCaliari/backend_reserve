import { ICreateSmtpServer } from "src/@types/@smtp-server";

export function isSmtpServerDataValidToCreate(data: ICreateSmtpServer): ICreateSmtpServer {
    const { name, email, provider, domain } = data;

    if (!name || !email || !provider || !domain) {
        throw new Error('Name, email and provider are required');
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof provider !== 'number') {
        throw new Error('Name must be a string, email must be a string and provider must be a number');
    }

    return {
        ...data
    }
}
