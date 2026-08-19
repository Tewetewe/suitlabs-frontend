/**
 * Printing from a laptop or desktop.
 *
 * The phones hand the receipt to a native app (the SuitLabs Print Bridge on
 * Android, Bluetooth Print on iOS). A computer has neither, so it prints the
 * receipt the browser is already showing.
 *
 * The receipt is copied into a hidden same-origin iframe rather than printed
 * from the live page. Printing the live page would mean hiding the whole
 * dashboard behind `@media print` rules and hoping no modal, backdrop or
 * sticky header leaks onto the paper. The iframe starts empty, so only what we
 * put in it can print.
 */
import {
  CUT_MARGIN_HTML,
  LABEL_CUT_MARGIN_MM,
  RECEIPT_PRINT_STYLES,
  RECEIPT_STYLES,
} from './receipt-styles';

/** Chrome needs a moment between `load` and `print()` or it prints a blank page. */
const RENDER_SETTLE_MS = 150;

/** How long to keep the iframe around after printing, for slower print queues. */
const CLEANUP_DELAY_MS = 1000;

function buildDocument(bodyHTML: string, title: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>${RECEIPT_STYLES}</style>
<style>${RECEIPT_PRINT_STYLES}</style>
</head>
<body>${bodyHTML}${CUT_MARGIN_HTML}</body>
</html>`;
}

/**
 * Print one receipt node through the browser's own print dialog.
 *
 * Returns false when there is no DOM to print from (server render), so the
 * caller can fall through to another route instead of silently doing nothing.
 */
export function printReceiptNode(node: HTMLElement | null, title = 'Receipt'): boolean {
  if (typeof document === 'undefined' || !node) return false;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  let cleanedUp = false;
  const cleanUp = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    window.setTimeout(() => iframe.remove(), CLEANUP_DELAY_MS);
  };

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanUp();
      return;
    }
    // Safari fires afterprint; Chrome resolves print() synchronously. Either
    // way the iframe is removed exactly once.
    frameWindow.addEventListener('afterprint', cleanUp);
    window.setTimeout(() => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } catch {
        // A blocked print dialog is the user's call, not an error worth raising.
      }
      cleanUp();
    }, RENDER_SETTLE_MS);
  };

  document.body.appendChild(iframe);

  const frameDocument = iframe.contentWindow?.document;
  if (!frameDocument) {
    iframe.remove();
    return false;
  }
  frameDocument.open();
  frameDocument.write(buildDocument(node.outerHTML, title));
  frameDocument.close();
  return true;
}

/**
 * Find the receipt inside an open invoice modal.
 *
 * Both invoice modals render `.thermal-receipt` inside `.thermal-receipt-container`;
 * the inner node is the paper itself, without the on-screen centring wrapper.
 */
export function findOpenReceiptNode(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>('.thermal-receipt-container .thermal-receipt');
}

/**
 * Print a barcode label, which is a canvas image rather than a DOM receipt.
 *
 * The image has to finish decoding before `print()` or the sheet comes out
 * blank, so this waits on the img's own load event instead of a fixed delay.
 */
export function printImageDataUrl(dataUrl: string, title = 'Label'): boolean {
  if (typeof document === 'undefined' || !dataUrl) return false;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const frameDocument = iframe.contentWindow?.document;
  if (!frameDocument) {
    iframe.remove();
    return false;
  }

  frameDocument.open();
  frameDocument.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @page { size: auto; margin: 4mm; }
  html, body { margin: 0; padding: 0; background: #fff; }
  img { display: block; width: 58mm; max-width: 100%; image-rendering: crisp-edges; }
  /* Blank paper so the label clears the tear bar without a manual feed. */
  .label-cut-margin { height: ${LABEL_CUT_MARGIN_MM}mm; }
</style>
</head>
<body><img id="label" alt="${title}" src="${dataUrl}"><div class="label-cut-margin"></div></body>
</html>`);
  frameDocument.close();

  const image = frameDocument.getElementById('label') as HTMLImageElement | null;
  const run = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // A blocked print dialog is the user's call.
    }
    window.setTimeout(() => iframe.remove(), CLEANUP_DELAY_MS);
  };

  if (image && !image.complete) {
    image.onload = run;
    image.onerror = run;
  } else {
    window.setTimeout(run, RENDER_SETTLE_MS);
  }
  return true;
}
