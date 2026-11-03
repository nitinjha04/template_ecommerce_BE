/** Normalize hostname for store lookup (no protocol, no www, lowercase). */
export const normalizeStoreDomain = (raw: string): string => {
  let value = raw.trim().toLowerCase();
  if (!value) return '';

  try {
    if (value.includes('://')) {
      value = new URL(value).hostname;
    } else if (value.includes('/')) {
      value = new URL(`https://${value}`).hostname;
    }
  } catch {
    value = value.split('/')[0] ?? value;
  }

  value = value.split(':')[0] ?? value;
  if (value.startsWith('www.')) {
    value = value.slice(4);
  }

  return value;
};

export const extractDomainFromRequest = (input: {
  headerDomain?: string;
  origin?: string;
  referer?: string;
  host?: string;
}): string | undefined => {
  const candidates = [
    input.headerDomain,
    input.origin,
    input.referer,
    input.host,
  ];

  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const normalized = normalizeStoreDomain(raw);
    if (normalized) return normalized;
  }

  return undefined;
};
