import { ApiError } from '../utils/ApiError';

export type PincodeResult = {
  city: string;
  state: string;
};

const TIMEOUT_MS = 8000;

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** https://api.postalpincode.in — often unreliable; try first when up. */
const tryPostalPincodeIn = async (pin: string): Promise<PincodeResult | null> => {
  type Office = { District?: string; State?: string; Name?: string };
  type Block = { Status?: string; PostOffice?: Office[] };

  const data = await fetchJson<Block[]>(
    `https://api.postalpincode.in/pincode/${pin}`
  );
  const block = Array.isArray(data) ? data[0] : undefined;
  if (block?.Status !== 'Success' || !block.PostOffice?.length) return null;

  const office = block.PostOffice[0];
  const city = (office.District || office.Name || '').trim();
  const state = (office.State || '').trim();
  if (!city && !state) return null;
  return { city, state };
};

/** https://api.zippopotam.us — free, no key; limited India coverage. */
const tryZippopotam = async (pin: string): Promise<PincodeResult | null> => {
  type Place = { 'place name'?: string; state?: string };
  type ZipBody = { places?: Place[] };

  const data = await fetchJson<ZipBody>(`https://api.zippopotam.us/in/${pin}`);
  const place = data?.places?.[0];
  if (!place) return null;

  const city = (place['place name'] || '').trim();
  const state = (place.state || '').trim();
  if (!city && !state) return null;
  return { city, state };
};

/** OpenStreetMap Nominatim — broad India coverage; requires User-Agent. */
const tryNominatim = async (pin: string): Promise<PincodeResult | null> => {
  type NominatimRow = {
    address?: {
      city?: string;
      town?: string;
      village?: string;
      state?: string;
      county?: string;
    };
  };

  const params = new URLSearchParams({
    postalcode: pin,
    countrycodes: 'in',
    format: 'json',
    addressdetails: '1',
    limit: '1',
  });

  const data = await fetchJson<NominatimRow[]>(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        'User-Agent': 'CasaqEcommerce/1.0 (checkout pincode lookup)',
        Accept: 'application/json',
      },
    }
  );

  const row = Array.isArray(data) ? data[0] : undefined;
  const addr = row?.address;
  if (!addr) return null;

  const city = (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.county ||
    ''
  ).trim();
  const state = (addr.state || '').trim();
  if (!city && !state) return null;
  return { city, state };
};

export class PincodeService {
  static async lookup(rawPin: string): Promise<PincodeResult> {
    const pin = String(rawPin ?? '').replace(/\D/g, '');
    if (pin.length !== 6) {
      throw new ApiError(400, 'PIN code must be 6 digits');
    }

    const result =
      (await tryPostalPincodeIn(pin)) ||
      (await tryZippopotam(pin)) ||
      (await tryNominatim(pin));

    if (!result) {
      throw new ApiError(404, 'PIN code not found');
    }

    return result;
  }
}
