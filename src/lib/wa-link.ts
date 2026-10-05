// Helpers to send a WhatsApp message by hand from the shop phone, when Wablas
// does not send it.

/** Opens a chat with the number and the text already filled in. */
export function waChatLink(phone: string, text: string): string {
  let digits = (phone || '').replace(/\D/g, '');
  // A local Indonesian number starts with 0; WhatsApp needs the 62 country code.
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${query}`;
}

/** Copies the text. Returns false when the browser blocks the clipboard. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea copy, which works on older phone browsers.
  }
  if (typeof document === 'undefined') return false;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}
