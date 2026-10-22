"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PincodeService = void 0;
const ApiError_1 = require("../utils/ApiError");
const TIMEOUT_MS = 8000;
const fetchJson = async (url, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            ...init,
            signal: controller.signal,
        });
        if (!res.ok)
            return null;
        return (await res.json());
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timer);
    }
};
/** https://api.postalpincode.in — often unreliable; try first when up. */
const tryPostalPincodeIn = async (pin) => {
    const data = await fetchJson(`https://api.postalpincode.in/pincode/${pin}`);
    const block = Array.isArray(data) ? data[0] : undefined;
    if (block?.Status !== 'Success' || !block.PostOffice?.length)
        return null;
    const office = block.PostOffice[0];
    const city = (office.District || office.Name || '').trim();
    const state = (office.State || '').trim();
    if (!city && !state)
        return null;
    return { city, state };
};
/** https://api.zippopotam.us — free, no key; limited India coverage. */
const tryZippopotam = async (pin) => {
    const data = await fetchJson(`https://api.zippopotam.us/in/${pin}`);
    const place = data?.places?.[0];
    if (!place)
        return null;
    const city = (place['place name'] || '').trim();
    const state = (place.state || '').trim();
    if (!city && !state)
        return null;
    return { city, state };
};
/** OpenStreetMap Nominatim — broad India coverage; requires User-Agent. */
const tryNominatim = async (pin) => {
    const params = new URLSearchParams({
        postalcode: pin,
        countrycodes: 'in',
        format: 'json',
        addressdetails: '1',
        limit: '1',
    });
    const data = await fetchJson(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: {
            'User-Agent': 'CasaqEcommerce/1.0 (checkout pincode lookup)',
            Accept: 'application/json',
        },
    });
    const row = Array.isArray(data) ? data[0] : undefined;
    const addr = row?.address;
    if (!addr)
        return null;
    const city = (addr.city ||
        addr.town ||
        addr.village ||
        addr.county ||
        '').trim();
    const state = (addr.state || '').trim();
    if (!city && !state)
        return null;
    return { city, state };
};
class PincodeService {
    static async lookup(rawPin) {
        const pin = String(rawPin ?? '').replace(/\D/g, '');
        if (pin.length !== 6) {
            throw new ApiError_1.ApiError(400, 'PIN code must be 6 digits');
        }
        const result = (await tryPostalPincodeIn(pin)) ||
            (await tryZippopotam(pin)) ||
            (await tryNominatim(pin));
        if (!result) {
            throw new ApiError_1.ApiError(404, 'PIN code not found');
        }
        return result;
    }
}
exports.PincodeService = PincodeService;
