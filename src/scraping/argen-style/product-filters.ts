import type { NykaaProductRaw } from '../nykaa/types';
import { buildNykaaProductName, collectNykaaImages } from '../nykaa/map-nykaa-product';
import { filterProductImages, imageKeysFromUrls } from './image-utils';

const BLOCKED_TEXT = /\b(nykaa|pakistan|pakistani)\b/i;

export type ProductRejectReason =
  | 'duplicate-id'
  | 'no-images'
  | 'designedit-only'
  | 'duplicate-image'
  | 'blocklisted-image'
  | 'blocked-text'
  | 'no-category';

export const collectArgenImages = (raw: NykaaProductRaw): string[] =>
  filterProductImages(collectNykaaImages(raw));

export const productTextBlob = (raw: NykaaProductRaw): string => {
  const name = buildNykaaProductName(raw);
  const tags = (raw.tag ?? []).join(' ');
  return `${name} ${raw.subTitle ?? ''} ${tags}`;
};

export const hasBlockedText = (raw: NykaaProductRaw): boolean =>
  BLOCKED_TEXT.test(productTextBlob(raw));
