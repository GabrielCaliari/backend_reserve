/**
 * Phone number helpers using libphonenumber-js
 */
import parsePhoneNumberLib, { parsePhoneNumberFromString } from 'libphonenumber-js';

export function getCountryCodeFromPhoneNumber(phone: string): string | null {
  const phoneNumber = parsePhoneNumberFromString(phone);

  if (phoneNumber && phoneNumber.isValid()) {
    return phoneNumber.country ?? null;
  }

  return null;
}

export function normalizePhoneNumber(phone: string): string | null {
  const phoneNumber = parsePhoneNumberLib(phone);
  if (phoneNumber && phoneNumber.isValid()) {
    return phoneNumber.number.toString();
  }

  return null;
}
