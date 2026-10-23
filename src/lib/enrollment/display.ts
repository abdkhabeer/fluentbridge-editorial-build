import { buildPriceSnapshot, describeSnapshot } from "@/data/pricing";
import { CONTACT } from "@/lib/contact";

export const STEP_TITLES = ["About you", "Your goals", "Your lessons", "Payment & schedule"] as const;

export const packageSummary = (id: string) => {
  const s = buildPriceSnapshot(id);
  return s ? describeSnapshot(s) : "I need help choosing";
};

const whatsappTo = (text: string) => `https://wa.me/${CONTACT.whatsappDigits}?text=${encodeURIComponent(text)}`;

/** WhatsApp link with a prefilled message. Contains only first name and level range, never contact details. */
export const whatsappLink = (firstName: string, levelRange: string) =>
  whatsappTo(`Hi Abdul, I'm ${firstName}. I just completed the FluentBridges placement test (level range: ${levelRange}). I'd like to discuss my results and next steps.`);

/** Trial booking: the booking page when BOOKING_URL is set, otherwise WhatsApp with a prefilled request. */
export const bookingLink = (bookingUrl: string | null) => bookingUrl ?? whatsappTo("Hi Abdul, I'd like to book my 30 minute trial");
