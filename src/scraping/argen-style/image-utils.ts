const DESIGNEDIT_PATTERN = /designedit_image/i;

export const normalizeImageUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  const withProtocol = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
  return withProtocol.split('?')[0] ?? withProtocol;
};

/** Stable key for deduplication (pathname, lowercased). */
export const imageDedupeKey = (url: string): string => {
  const normalized = normalizeImageUrl(url).toLowerCase();
  try {
    const parsed = new URL(
      normalized.startsWith('http') ? normalized : `https:${normalized}`
    );
    return parsed.pathname || normalized;
  } catch {
    return normalized;
  }
};

export const isBlockedImageUrl = (url: string): boolean =>
  DESIGNEDIT_PATTERN.test(url);

/** Remove designedit images; dedupe by pathname. */
export const filterProductImages = (urls: string[]): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of urls) {
    if (!raw || isBlockedImageUrl(raw)) continue;
    const clean = normalizeImageUrl(raw);
    if (!clean) continue;
    const key = imageDedupeKey(clean);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }

  return out;
};

export const imageKeysFromUrls = (urls: string[]): string[] =>
  urls.map((u) => imageDedupeKey(u)).filter(Boolean);
