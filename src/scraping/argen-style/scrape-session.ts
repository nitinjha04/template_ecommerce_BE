import { Product } from '../../models';
import { mergeStoreFilter } from '../../utils/storeScope';
import type { NykaaProductRaw } from '../nykaa/types';
import { collectArgenImages, hasBlockedText } from './product-filters';
import { imageDedupeKey, imageKeysFromUrls, normalizeImageUrl } from './image-utils';
import * as fs from 'fs';
import * as path from 'path';

export class ScrapeSession {
  readonly usedNykaaIds = new Set<string>();
  readonly usedImageKeys = new Set<string>();
  readonly blocklistKeys = new Set<string>();

  private constructor(
    readonly storeId: string,
    existingDbKeys: Iterable<string>
  ) {
    for (const key of existingDbKeys) {
      this.usedImageKeys.add(key);
    }
  }

  static async create(
    storeId: string,
    blocklistPath?: string
  ): Promise<ScrapeSession> {
    const dbKeys = await ScrapeSession.loadStoreImageKeys(storeId);
    const session = new ScrapeSession(storeId, dbKeys);
    session.loadBlocklist(blocklistPath);
    return session;
  }

  static async loadStoreImageKeys(storeId: string): Promise<string[]> {
    const rows = await Product.find(mergeStoreFilter({}, storeId))
      .select('images')
      .lean<{ images?: string[] }[]>();

    const keys: string[] = [];
    for (const row of rows) {
      for (const url of row.images ?? []) {
        if (!url) continue;
        keys.push(imageDedupeKey(url));
      }
    }
    return keys;
  }

  loadBlocklist(filePath?: string): void {
    const abs = path.resolve(
      filePath?.trim() || path.join(__dirname, 'image-blocklist.json')
    );
    if (!fs.existsSync(abs)) return;

    const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8')) as unknown;
    const urls = Array.isArray(parsed) ? parsed : [];
    for (const entry of urls) {
      const url = String(entry).trim();
      if (!url) continue;
      this.blocklistKeys.add(imageDedupeKey(url));
      this.blocklistKeys.add(normalizeImageUrl(url).toLowerCase());
    }
  }

  rejectReason(raw: NykaaProductRaw): string | null {
    const id = raw.id?.trim();
    if (!id) return 'missing-id';
    if (this.usedNykaaIds.has(id)) return 'duplicate-id';
    if (hasBlockedText(raw)) return 'blocked-text';

    const images = collectArgenImages(raw);
    if (images.length === 0) {
      const rawImages = (raw.plp_pdp_bridge?.images ?? [])
        .map((i) => i.url ?? '')
        .concat(raw.imageUrl ?? '');
      const hadDesignedit = rawImages.some((u) => /designedit_image/i.test(u));
      return hadDesignedit ? 'designedit-only' : 'no-images';
    }

    const keys = imageKeysFromUrls(images);
    for (const key of keys) {
      if (this.blocklistKeys.has(key)) return 'blocklisted-image';
      if (this.usedImageKeys.has(key)) return 'duplicate-image';
    }

    return null;
  }

  markAccepted(raw: NykaaProductRaw, images: string[]): void {
    const id = raw.id?.trim();
    if (id) this.usedNykaaIds.add(id);
    for (const key of imageKeysFromUrls(images)) {
      this.usedImageKeys.add(key);
    }
  }
}
