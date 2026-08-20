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

const LABEL_CUT_MARGIN_HTML = `<div style="height:${LABEL_CUT_MARGIN_MM}mm"></div>`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceCanvasWithImage(dst: HTMLCanvasElement, src: HTMLCanvasElement): void {
  try {
    const img = document.createElement('img');
    img.src = src.toDataURL('image/png');
    img.alt = '';
    img.style.width = '100%';
    img.style.height = 'auto';
    dst.replaceWith(img);
  } catch {
    // A tainted canvas cannot be snapshotted; the empty clone is the fallback.
  }
}

/**
 * Copy a receipt node as HTML, turning canvases into images so the barcode
 * survives the trip into the print iframe. `outerHTML` of a canvas is an empty
 * tag — without this the bars vanish on paper.
 */
function htmlWithCanvasImages(node: HTMLElement): string {
  if (node instanceof HTMLCanvasElement) {
    const wrap = document.createElement('div');
    const clone = node.cloneNode(true) as HTMLCanvasElement;
    wrap.appendChild(clone);
    replaceCanvasWithImage(clone, node);
    return wrap.innerHTML;
  }
  const clone = node.cloneNode(true) as HTMLElement;
  const sources = Array.from(node.querySelectorAll('canvas'));
  const destinations = Array.from(clone.querySelectorAll('canvas'));
  sources.forEach((src, i) => {
    const dst = destinations[i];
    if (dst) replaceCanvasWithImage(dst, src);
  });
  return clone.outerHTML;
}

function buildDocument(bodyHTML: string, title: string, cutMarginHTML = CUT_MARGIN_HTML): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${RECEIPT_STYLES}</style>
<style>${RECEIPT_PRINT_STYLES}</style>
</head>
<body>${bodyHTML}${cutMarginHTML}</body>
</html>`;
}

function printHTML(bodyHTML: string, title: string, cutMarginHTML = CUT_MARGIN_HTML): boolean {
  if (typeof document === 'undefined') return false;

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
  frameDocument.write(buildDocument(bodyHTML, title, cutMarginHTML));
  frameDocument.close();
  return true;
}

/**
 * Print one receipt node through the browser's own print dialog.
 *
 * Returns false when there is no DOM to print from (server render), so the
 * caller can fall through to another route instead of silently doing nothing.
 */
export function printReceiptNode(node: HTMLElement | null, title = 'Receipt'): boolean {
  if (typeof document === 'undefined' || !node) return false;
  return printHTML(htmlWithCanvasImages(node), title);
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

export function findOpenReceiptBarcodeNode(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>('.thermal-receipt-container .receipt-barcode');
}

/**
 * Print just the invoice barcode — the number as text plus the bars — on a
 * short slip. Uses the label tear-bar gap because this is a reprint, not a
 * full receipt.
 */
export function printOpenReceiptBarcode(invoiceNumber: string, title = 'Barcode'): boolean {
  const barcode = findOpenReceiptBarcodeNode();
  if (!barcode) return false;
  const number = escapeHtml(invoiceNumber);
  const body = `<div class="thermal-receipt"><div class="receipt-center"><div class="receipt-line">${number}</div>${htmlWithCanvasImages(barcode)}</div></div>`;
  return printHTML(body, title, LABEL_CUT_MARGIN_HTML);
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

  const safeTitle = escapeHtml(title);
  frameDocument.open();
  frameDocument.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<style>
  @page { size: auto; margin: 4mm; }
  html, body { margin: 0; padding: 0; background: #fff; }
  img { display: block; width: 58mm; max-width: 100%; image-rendering: crisp-edges; }
  /* Blank paper so the label clears the tear bar without a manual feed. */
  .label-cut-margin { height: ${LABEL_CUT_MARGIN_MM}mm; }
</style>
</head>
<body><img id="label" alt="${safeTitle}" src="${dataUrl}"><div class="label-cut-margin"></div></body>
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
