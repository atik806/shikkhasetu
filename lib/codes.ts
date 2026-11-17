// Random identifiers and codes. Uses crypto.getRandomValues — never Math.random for anything
// a person might try to guess (verification codes, OTPs, slip codes).

const BASE32 = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L to avoid confusion when read aloud

function randomInts(n: number, max: number): number[] {
  const buf = new Uint32Array(n);
  globalThis.crypto.getRandomValues(buf);
  return Array.from(buf, (v) => v % max);
}

export function randomCode(length: number, alphabet = BASE32): string {
  return randomInts(length, alphabet.length)
    .map((i) => alphabet[i])
    .join("");
}

/** e.g. SS-7K3FQ-92QDX — 10 random chars from a 31-char alphabet (~49 bits). */
export function verificationCode(): string {
  const c = randomCode(10);
  return `SS-${c.slice(0, 5)}-${c.slice(5)}`;
}

export function otpCode(): string {
  return randomCode(6, "0123456789");
}

export function slipCode(): string {
  const c = randomCode(8);
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${randomCode(12, "abcdefghijklmnopqrstuvwxyz0123456789")}`;
}

/**
 * MOCK ONLY: non-cryptographic hash so the demo never keeps plain passwords/PINs in state.
 * The real backend must use argon2/bcrypt.
 */
export function mockHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2654435761) >>> 0;
  }
  return `mock$${h1.toString(16)}${h2.toString(16)}`;
}
