import os from 'node:os';

/** Local non-internal IPv4 addresses on this machine/container. */
export const getLocalIpv4Addresses = (): string[] => {
  const out: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    if (!list) continue;
    for (const entry of list) {
      if (entry.family === 'IPv4' && !entry.internal) {
        out.push(entry.address);
      }
    }
  }
  return [...new Set(out)];
};

/**
 * Public outbound IPv4 (what payment gateways / IP allowlists usually need).
 * Uses ipify; fails soft if the host has no egress or the call times out.
 */
export const fetchPublicIpv4 = async (
  timeoutMs = 5_000
): Promise<string | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { ip?: string };
    const ip = body.ip?.trim();
    return ip || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** Log local + public IPs at startup for gateway / sender allowlists. */
export const logServerIps = async (): Promise<void> => {
  const local = getLocalIpv4Addresses();
  console.log(
    `[server-ip] local IPv4: ${local.length ? local.join(', ') : '(none)'}`
  );

  const publicIp = await fetchPublicIpv4();
  if (publicIp) {
    console.log(
      `[server-ip] public outbound IPv4 (add to verified / allowlist): ${publicIp}`
    );
  } else {
    console.warn(
      '[server-ip] could not resolve public outbound IPv4 (check egress / try GET /api/v1/health)'
    );
  }
};
