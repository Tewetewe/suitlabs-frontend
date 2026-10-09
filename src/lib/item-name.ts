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

function isSuitTabItem(item: TaggedItem | null | undefined): boolean {
  return !!item?.type && SUIT_TAB_TYPES.has(item.type);
}

type TaggedItem = { name?: string; brand?: string; type?: string; gender?: string; quality?: string };

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
