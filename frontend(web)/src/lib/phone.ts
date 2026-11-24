// Ethiopian mobile numbers: +2519XXXXXXXX or 09XXXXXXXX.
const ETHIOPIAN_MOBILE = /^(\+251|0)9\d{8}$/

export function isValidPhone(phone: string): boolean {
  return ETHIOPIAN_MOBILE.test(phone)
}

// Shows only the start and end of a number, e.g. +251•••••001.
export function maskPhone(phone: string): string {
  return phone.length <= 7 ? phone : `${phone.slice(0, 4)}•••••${phone.slice(-3)}`
}