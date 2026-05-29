const stripWrappingQuotes = (value: string): string => {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
};

/**
 * Env PEMs are often stored with literal `\n`. This normalizes into real newlines
 * without logging or exposing key material.
 */
export const normalizePemFromEnv = (value: string): string =>
  stripWrappingQuotes(value).replace(/\\n/g, '\n').trim();

