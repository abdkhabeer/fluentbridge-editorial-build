import { buildPriceSnapshot, formatEgp } from "@/data/pricing";
import { CONTACT } from "@/lib/contact";

export const STEP_TITLES = ["About you", "Your goals", "Your lessons", "Payment & schedule"] as const;

export const packageSummary = (id: string) => {
  const s = buildPriceSnapshot(id);
  if (!s) return "I need help choosing";
  if (!s.track_heading) return `${s.title}: ${formatEgp(s.price_egp!)} for ${s.duration_minutes} minutes`;
  const per = s.lessons! > 1 ? ` (${formatEgp(s.per_lesson_egp!)} per lesson, valid ${s.validity_days} days)` : "";
  return `${s.track_heading}, ${s.title}: ${formatEgp(s.price_egp!)}${s.per_student ? " per student" : ""}${per}`;
};

/** WhatsApp link with a prefilled message. Contains only first name and level, never contact details. */
export const whatsappLink = (firstName: string, level: string) => {
  const text = `Hi! I'm ${firstName}. I just completed the Fluent Bridges placement test (estimated level: ${level}). I'd like to discuss my results and next steps.`;
  return `https://wa.me/${CONTACT.whatsappDigits}?text=${encodeURIComponent(text)}`;
};
