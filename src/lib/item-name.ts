/**
 * The gender as the sheet writes it. Unisex is the import default for an Item
 * with no gender, so it has no label.
 */
export const ITEM_GENDER_LABELS: Record<string, string> = {
  kids: 'Kids',
  men: 'Mens',
  women: 'Womens',
};

/** The tier as people read it. */
export const ITEM_QUALITY_LABELS: Record<string, string> = {
  premium: 'Premium',
  standard: 'Standard',
};

/** The type as the customer reads it. Accessory and Retail say nothing, so they have none. */
const ITEM_TYPE_LABELS: Record<string, string> = {
  suit: 'Suit',
  jacket: 'Jacket',
  trousers: 'Trousers',
  shirt: 'Shirt',
  shirts: 'Shirt',
  vest: 'Vest',
  tie: 'Tie',
  shoes: 'Shoes',
  belt: 'Belt',
};

/**
 * The Items of the Suit tab, which carry a gender and a tier in the sheet. The
 * Acc tab Items wait for their own gender and tier rule: for now they get only
 * the type.
 */
const SUIT_TAB_TYPES = new Set(['suit', 'jacket', 'trousers']);

export function isSuitTabItem(item: TaggedItem | null | undefined): boolean {
  return !!item?.type && SUIT_TAB_TYPES.has(item.type);
}

type TaggedItem = {
  name?: string;
  display_name?: string;
  brand?: string;
  type?: string;
  gender?: string;
  quality?: string;
  color?: string;
  size?: { label?: string } | null;
};

/**
 * Other words for a type, such as the Indonesian one. A name that has one
 * already says the type, so the type is not added again.
 */
const TYPE_WORDS: Record<string, string[]> = {
  shoes: ['sepatu', 'shoe'],
  shirt: ['kemeja'],
  tie: ['dasi'],
  vest: ['rompi'],
  belt: ['sabuk', 'ikat pinggang'],
};

export function itemGenderLabel(gender?: string | null): string {
  return gender ? ITEM_GENDER_LABELS[gender] ?? '' : '';
}

export function itemQualityLabel(quality?: string | null): string {
  return quality ? ITEM_QUALITY_LABELS[quality] ?? '' : '';
}

/** The gender of a Suit tab Item, for example "Mens". Other Items have none for now. */
export function itemGenderTag(item: TaggedItem | null | undefined): string {
  return isSuitTabItem(item) ? itemGenderLabel(item?.gender) : '';
}

/** The tier of a Suit tab Item, for example "Premium". Other Items have none for now. */
export function itemTierTag(item: TaggedItem | null | undefined): string {
  return isSuitTabItem(item) ? itemQualityLabel(item?.quality) : '';
}

/** The gender and tier of a Suit tab Item, for example ["Mens", "Premium"]. Other Items have none for now. */
export function itemTags(item: TaggedItem | null | undefined): string[] {
  return [itemGenderTag(item), itemTierTag(item)].filter(Boolean);
}

function wordPattern(word: string, flags = 'i'): RegExp {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, flags);
}

/**
 * The Item name for anything the customer sees: invoices, receipts, and labels.
 * The brand is the supplier, kept for staff only. The gender and tier of a Suit
 * tab Item, and the type of any Item, take its place: "Black L - Goldy (Double Breasted)" prints as
 * "Black L - Mens Premium Suit (Double Breasted)". A name with no brand gets
 * them at the end: "Black 01 - Mens Premium Suit". A word the name already has
 * is not added again. With nothing to add, the brand comes out with the dash
 * before it. The backend applies the same rule in Item.CustomerName.
 */
export function customerItemName(item: TaggedItem | null | undefined): string {
  const name = (item?.name || '').trim();
  if (!name) return name;
  if (!isSuitTabItem(item)) return accCustomerName(item as TaggedItem, normalizeSizesInText(name));
  return withSizeAndColour(item as TaggedItem, suitCustomerName(item, name));
}

/** The name on an invoice or receipt line: the complete name carries the size (Item.CustomerLineName). */
export function customerLineName(item: TaggedItem | null | undefined): string {
  return customerItemName(item);
}

/** What a staff list shows under the name: the code. The complete name carries the rest. */
export function itemDetails(item: { code?: string } | null | undefined): string {
  return item?.code || '';
}

/** The colour words a Suit name may carry for its shade (backend colourWords). */
const COLOUR_WORDS = [
  'black', 'white', 'grey', 'gray', 'navy', 'blue', 'brown', 'cream', 'beige', 'red',
  'maroon', 'burgundy', 'green', 'coffee', 'khaki', 'olive', 'silver', 'gold', 'pink',
  'purple', 'ivory', 'charcoal', 'tan', 'putih', 'hitam', 'abu',
];

/** Puts a word before the first dash of a name, where the colour and size end. */
function insertBeforeDash(name: string, word: string): string {
  const dash = /\s*[-–—]\s/.exec(name);
  return dash ? `${name.slice(0, dash.index).trim()} ${word}${name.slice(dash.index)}` : `${name} ${word}`;
}

/**
 * A Suit tab name shows its size and colour, as an Acc name does. A size in
 * the name reads as a number (2XL); a size missing from the name goes before
 * the dash. The shade in the name stays ("Dark Grey"); the COLOR value goes in
 * front only when the name has no colour at all (Item.withSizeAndColour).
 */
function withSizeAndColour(item: TaggedItem, text: string): string {
  let name = normalizeSizesInText(text);
  const size = normalizeSizeLabel(item.size?.label);
  if (size && !wordPattern(size).test(name)) name = insertBeforeDash(name, size);
  const color = normalizeColorLabel(item.color);
  if (color && !wordPattern(color).test(name) && !COLOUR_WORDS.some((word) => wordPattern(word).test(name))) {
    name = `${color} ${name}`;
  }
  return name;
}

/** Writes a size with repeated X as a number, so sizes up to 5XL read alike: XXL is 2XL. */
export function normalizeSizeLabel(label?: string | null): string {
  const value = (label || '').trim();
  const match = /^(x{2,})([ls])$/i.exec(value);
  return match ? `${match[1].length}X${match[2].toUpperCase()}` : value;
}

/** Writes every size with repeated X in a text as a number: "Black XXL" reads "Black 2XL". */
function normalizeSizesInText(text: string): string {
  return text.replace(/\b(x{2,})([ls])\b/gi, (word) => normalizeSizeLabel(word));
}

/** Writes a colour one way for every tab: "Off-White" and "off white" both read "Off White". */
export function normalizeColorLabel(color?: string | null): string {
  return (color || '')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Replaces the brand of a Suit tab name with its gender, tier and type. */
function suitCustomerName(item: TaggedItem | null | undefined, name: string): string {
  const brand = (item?.brand || '').trim();
  const hasBrand = brand !== '' && wordPattern(brand).test(name);
  const base = hasBrand ? name.replace(wordPattern(brand, 'gi'), '') : name;
  const typeLabel = item?.type ? ITEM_TYPE_LABELS[item.type] ?? '' : '';
  const tags = [...itemTags(item), typeLabel]
    .filter((word) => word && !wordPattern(word).test(base))
    .join(' ');
  if (hasBrand && tags) {
    return name.replace(wordPattern(brand, 'gi'), tags).replace(/\s+/g, ' ').trim();
  }
  if (hasBrand) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const stripped = name
      .replace(new RegExp(`\\s*[-–—]?\\s*\\b${escaped}\\b`, 'gi'), '')
      .replace(/\s+/g, ' ')
      .replace(/^[\s\-–—]+|[\s\-–—]+$/g, '');
    return stripped || name;
  }
  return tags ? `${name} - ${tags}` : name;
}

/**
 * An Acc tab Item follows the Suit name: colour and size, a dash, then the
 * model and the type, as in "Black L - Vest" or "Off-White XL - Regular
 * Shirt". With no colour and no size, the type follows the dash: "Parayu kids
 * - Shirt". The brand is the supplier and leaves. A word the name already has
 * is not added again, nor a type the name says in another word ("Sepatu
 * Oxford" stays without "Shoes"). The backend keeps the same rule in
 * Item.accCustomerName.
 */
function accCustomerName(item: TaggedItem, name: string): string {
  let model = name;
  const brand = (item.brand || '').trim();
  if (brand && wordPattern(brand).test(name)) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const stripped = name
      .replace(new RegExp(`\\s*[-–—]?\\s*\\b${escaped}\\b`, 'gi'), '')
      .replace(/\s+/g, ' ')
      .replace(/^[\s\-–—]+|[\s\-–—]+$/g, '');
    if (stripped) model = stripped;
  }
  const label = item.type ? ITEM_TYPE_LABELS[item.type] ?? '' : '';
  const saysType = (TYPE_WORDS[item.type || ''] || []).some((word) => wordPattern(word).test(model));
  const typeLabel = label && !wordPattern(label).test(model) && !saysType ? label : '';
  const prefix: string[] = [];
  const color = normalizeColorLabel(item.color);
  if (color && !wordPattern(color).test(model)) prefix.push(color);
  const size = normalizeSizeLabel(item.size?.label);
  if (size && !wordPattern(size).test(model) && !wordPattern(size).test(prefix.join(' '))) prefix.push(size);
  if (prefix.length === 0) return typeLabel ? `${model} - ${typeLabel}` : model;
  return `${prefix.join(' ')} - ${typeLabel ? `${model} ${typeLabel}` : model}`;
}

/**
 * The complete name Staff see in the app, as the backend fills it in
 * display_name: the printed name with the brand kept where the name has it
 * ("Black L - Goldy Mens Premium Suit"). An Item from an older answer falls
 * back to its stored name.
 */
export function itemDisplayName(item: TaggedItem | null | undefined, fallback = ''): string {
  return (item?.display_name || item?.name || fallback).trim();
}
