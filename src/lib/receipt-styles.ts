/**
 * The 58 mm thermal receipt layout, shared by the on-screen preview in the
 * invoice modals and by the print-to-paper path in `print-browser`.
 *
 * It lives here so a laptop print and the preview it was launched from can
 * never drift apart — the print window is handed this exact stylesheet.
 */

/**
 * Blank paper printed after the receipt or the label, in millimetres.
 *
 * The print head sits about 15 mm behind the tear bar. Without this gap the
 * last lines stop inside the printer and the operator holds the feed button on
 * the device to pull the paper out. 20 mm clears the tear bar and matches the
 * 12 blank lines the ESC/POS routes feed before the cut.
 */
export const CUT_MARGIN_MM = 20;

/** The spacer node that carries `CUT_MARGIN_MM` into a print document. */
export const CUT_MARGIN_HTML = '<div class="receipt-cut-margin"></div>';

export const RECEIPT_STYLES = `
.thermal-receipt-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

.thermal-receipt {
  width: 58mm;
  max-width: 58mm;
  margin: 0 auto;
  padding: 8px 6px;
  background: white;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.4;
  color: #000;
}

.receipt-cut-margin {
  height: ${CUT_MARGIN_MM}mm;
}

.receipt-center {
  text-align: center;
  margin-bottom: 6px;
}

.receipt-title {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 3px;
  letter-spacing: 0.5px;
}

.receipt-subtitle {
  font-size: 8px;
  color: #666;
  margin-bottom: 4px;
}

.receipt-line {
  font-size: 11px;
  line-height: 1.45;
  margin-bottom: 2px;
  word-wrap: break-word;
}

.receipt-label {
  font-weight: bold;
  font-size: 11px;
  margin-bottom: 3px;
}

.receipt-small {
  font-size: 7px;
  color: #666;
}

.receipt-divider {
  border-top: 1px dashed #999;
  margin: 6px 0;
}

.receipt-item {
  margin-bottom: 4px;
}

.receipt-discount {
  color: #d32f2f;
}

.receipt-bold {
  font-weight: bold;
}

.receipt-total {
  font-weight: bold;
  font-size: 12px;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #333;
}

.receipt-barcode {
  text-align: center;
  margin: 8px 0 4px;
}

.receipt-barcode canvas {
  width: 100%;
  height: 120px;
}
`;

/**
 * Page setup for the print window. Roll paper has no fixed page height, so the
 * page is 58 mm wide and as long as the receipt turns out to be; a sheet-fed
 * printer just puts that strip at the top of an A4 page.
 */
export const RECEIPT_PRINT_STYLES = `
@page {
  size: 58mm auto;
  margin: 0;
}

html, body {
  margin: 0;
  padding: 0;
  background: #fff;
}

.thermal-receipt {
  padding: 4px 6px;
}

/* Thermal paper is monochrome — force the colours through rather than letting
   the browser drop them to save toner. */
* {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
`;
