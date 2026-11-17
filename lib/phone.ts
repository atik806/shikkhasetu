/** Bangladeshi mobile number: optional +88 / 88 prefix, then 01[3-9] and 8 digits. */
export const BD_PHONE_REGEX = /^(?:\+?88)?01[3-9]\d{8}$/;

export function isValidBdPhone(input: string): boolean {
  return BD_PHONE_REGEX.test(input.replace(/[\s-]/g, ""));
}

/** Normalize to +8801XXXXXXXXX. Throws on invalid input. */
export function normalizeBdPhone(input: string): string {
  const raw = input.replace(/[\s-]/g, "");
  if (!BD_PHONE_REGEX.test(raw)) throw new Error("Invalid Bangladeshi mobile number");
  const local = raw.slice(raw.indexOf("01"));
  return `+88${local}`;
}

/** +8801712345678 → 017****5678 */
export function maskPhone(phone?: string): string {
  if (!phone) return "—";
  const local = phone.replace(/^\+?88/, "");
  if (local.length < 7) return local;
  return `${local.slice(0, 3)}****${local.slice(-4)}`;
}

export function localPhone(phone?: string): string {
  return phone ? phone.replace(/^\+?88/, "") : "";
}
