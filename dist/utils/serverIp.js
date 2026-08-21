"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logServerIps = exports.fetchPublicIpv4 = exports.getLocalIpv4Addresses = void 0;
const node_os_1 = __importDefault(require("node:os"));
/** Local non-internal IPv4 addresses on this machine/container. */
const getLocalIpv4Addresses = () => {
    const out = [];
    for (const list of Object.values(node_os_1.default.networkInterfaces())) {
        if (!list)
            continue;
        for (const entry of list) {
            if (entry.family === 'IPv4' && !entry.internal) {
                out.push(entry.address);
            }
        }
    }
    return [...new Set(out)];
};
exports.getLocalIpv4Addresses = getLocalIpv4Addresses;
/**
 * Public outbound IPv4 (what payment gateways / IP allowlists usually need).
 * Uses ipify; fails soft if the host has no egress or the call times out.
 */
const fetchPublicIpv4 = async (timeoutMs = 5_000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch('https://api.ipify.org?format=json', {
            signal: controller.signal,
        });
        if (!res.ok)
            return null;
        const body = (await res.json());
        const ip = body.ip?.trim();
        return ip || null;
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timer);
    }
};
exports.fetchPublicIpv4 = fetchPublicIpv4;
/** Log local + public IPs at startup for gateway / sender allowlists. */
const logServerIps = async () => {
    const local = (0, exports.getLocalIpv4Addresses)();
    console.log(`[server-ip] local IPv4: ${local.length ? local.join(', ') : '(none)'}`);
    const publicIp = await (0, exports.fetchPublicIpv4)();
    if (publicIp) {
        console.log(`[server-ip] public outbound IPv4 (add to verified / allowlist): ${publicIp}`);
    }
    else {
        console.warn('[server-ip] could not resolve public outbound IPv4 (check egress / try GET /api/v1/health)');
    }
};
exports.logServerIps = logServerIps;
