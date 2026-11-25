import { formatMoney } from "./format";

/**
 * WhatsApp contact link for a listing. The message is prefilled with the
 * house title, description and price, so the agent knows exactly which
 * home the customer is asking about.
 *
 * Phone numbers: an agent's stored number is used as-is when it already
 * carries a country code (e.g. +44...). A leading 0 (Nigerian local
 * format) keeps the previous behaviour of dialling via 234. A custom
 * whatsapp_link set by the agent is used untouched.
 */
export function buildWhatsAppHref(
  phoneNumber: string,
  whatsappLink: string | null | undefined,
  title: string,
  description: string,
  price: number | string,
  currency?: string | null,
): string {
  const custom = (whatsappLink || "").trim();
  if (custom) return custom;
  const digits = (phoneNumber || "").replace(/[^\d+]/g, "");
  if (!digits) return "";
  let number = digits;
  if (number.startsWith("+")) number = number.slice(1);
  else if (number.startsWith("0")) number = `234${number.slice(1)}`;
  const priceText = formatMoney(price, currency);
  const message =
    `Hello, I'm interested in "${title}" on Housify.\n\n` +
    `${description}\n\n` +
    `Price: ${priceText} / year. Please tell me more.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
