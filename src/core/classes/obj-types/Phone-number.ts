import { getCountryCodeFromPhoneNumber, normalizePhoneNumber } from "src/core/functions";

export default class PhoneNumber {
    private phone_number: string;

    constructor(phoneNumber: string) {
        // if (!normalizePhoneNumber(phoneNumber)) {
        //     throw new Error('Invalid phone number');
        // }
        
        this.phone_number = phoneNumber;
    }

    public toString(): string {
        return this.phone_number;
    }

    public getCountry(): string {
        return getCountryCodeFromPhoneNumber(this.phone_number);
    }
}
