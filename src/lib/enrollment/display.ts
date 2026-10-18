import { buildPriceSnapshot, describeSnapshot } from "@/data/pricing";
import { CONTACT } from "@/lib/contact";

export const STEP_TITLES = ["About you", "Your goals", "Your lessons", "Payment & schedule"] as const;

export const packageSummary = (id: string) => {
  const s = buildPriceSnapshot(id);
  return s ? describeSnapshot(s) : "I need help choosing";
};

/** WhatsApp link with a prefilled message. Contains only first name and level, never contact details. */
export const whatsappLink = (firstName: string, level: string) => {
  const text = `Hi! I'm ${firstName}. I just completed the Fluent Bridges placement test (estimated level: ${level}). I'd like to discuss my results and next steps.`;
  return `https://wa.me/${CONTACT.whatsappDigits}?text=${encodeURIComponent(text)}`;
};
