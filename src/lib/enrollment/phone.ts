import { DIAL_CODES } from "./countries";

/**
 * Normalises a phone number to E.164 (+<country><number>).
 * - "00" international prefix becomes "+".
 * - Numbers without a "+" get the residence country's dial code, dropping a
 *   leading trunk "0" (e.g. Egyptian "010 1234 5678" -> "+201012345678").
 * Returns null when the number cannot be interpreted.
 */
export const normalizePhone = (raw: string, country = ""): string | null => {
  let s = raw.trim().replace(/[\s\-().]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (!s.startsWith("+")) {
    const code = DIAL_CODES[country];
    if (!code) return null;
    s = `+${code}${s.replace(/^0/, "")}`;
  }
  // Egyptian numbers are sometimes written "+20 010...", keep the mobile prefix intact.
  if (s.startsWith("+200")) s = `+20${s.slice(4)}`;
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
};

/** Egyptian mobile numbers: +20 1[0,1,2,5] followed by 8 digits. */
export const isValidEgyptianMobile = (e164: string) => /^\+201[0125]\d{8}$/.test(e164);

export type PhoneCheck = { ok: true; e164: string; message?: undefined } | { ok: false; e164?: undefined; message: string };

export const checkPhone = (raw: string, country: string, { mobile }: { mobile: boolean }): PhoneCheck => {
  const e164 = normalizePhone(raw, country);
  if (!e164) {
    return {
      ok: false,
      message: DIAL_CODES[country]
        ? "Please enter a valid phone number."
        : "Please include your country code, starting with +.",
    };
  }
  if (mobile && e164.startsWith("+20") && !isValidEgyptianMobile(e164)) {
    return { ok: false, message: "Egyptian mobile numbers have 11 digits and start with 010, 011, 012, or 015." };
  }
  return { ok: true, e164 };
};

export const formatE164 = (e164: string) => {
  const m = /^\+(20)(\d{2})(\d{4})(\d{4})$/.exec(e164);
  if (m) return `+${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
  return e164;
};
