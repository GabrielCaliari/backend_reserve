import { getCountryCodeFromPhoneNumber } from '@/shared/helpers/phone.helper';

export default class PhoneNumber {
  private readonly phone_number: string;

  constructor(phoneNumber: string) {
    this.phone_number = phoneNumber;
  }

  public toString(): string {
    return this.phone_number;
  }

  public getCountry(): string | null {
    return getCountryCodeFromPhoneNumber(this.phone_number);
  }
}
