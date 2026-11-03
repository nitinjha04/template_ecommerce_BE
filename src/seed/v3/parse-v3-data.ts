import * as fs from 'fs';
import * as path from 'path';

export type V3ParsedRow = {
  images: string[];
  name: string;
  tag?: string;
};

const V3_DIR = path.join(__dirname);

export const MEN_FILE = path.join(V3_DIR, 'wedding-men-data.txt');
export const LEHENGA_FILE = path.join(V3_DIR, 'lehenga-women-data.txt');
export const SAREE_FILE = path.join(V3_DIR, 'saree-women-data.txt');

/** Remove Scene7 size suffix e.g. `:283x395` at end of URL. */
export const cleanScene7Url = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return trimmed.replace(/:\d+x\d+$/i, '');
};

const isDataLine = (line: string): boolean => {
  const t = line.trim();
  return t.startsWith('http://') || t.startsWith('https://');
};

const parseLine = (line: string, menFormat: boolean): V3ParsedRow | null => {
  const parts = line.split('\t').map((p) => p.trim());
  if (parts.length < 4 || !isDataLine(parts[0])) return null;

  const image1 = cleanScene7Url(parts[0]);
  const image2 = cleanScene7Url(parts[1]);
  const images = [image1, image2].filter(Boolean);
  const uniqueImages = [...new Set(images)];
  if (uniqueImages.length === 0) return null;

  let name = '';
  let tag: string | undefined;

  if (menFormat && parts.length >= 5) {
    tag = parts[2] || undefined;
    name = parts[3];
  } else {
    name = parts[2];
  }

  name = name.trim();
  if (!name || name.startsWith('http')) return null;

  return {
    images: uniqueImages,
    name,
    tag: tag?.trim() || undefined,
  };
};

export const parseV3File = (filePath: string, menFormat = false): V3ParsedRow[] => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows: V3ParsedRow[] = [];
  const seenNames = new Set<string>();

  for (const line of content.split(/\r?\n/)) {
    if (!isDataLine(line)) continue;
    const row = parseLine(line, menFormat);
    if (!row) continue;

    const key = row.name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    rows.push(row);
  }

  return rows;
};

export const loadMenV3Data = (): V3ParsedRow[] => parseV3File(MEN_FILE, true);
export const loadLehengaV3Data = (): V3ParsedRow[] => parseV3File(LEHENGA_FILE, false);
export const loadSareeV3Data = (): V3ParsedRow[] => parseV3File(SAREE_FILE, false);
