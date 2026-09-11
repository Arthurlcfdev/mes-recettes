import dns from "node:dns/promises";

function ipv4ToLong(ip) {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

// Ranges that must never be reachable from the server-side scraper (loopback,
// private LANs, link-local, CGNAT, cloud metadata endpoint, multicast/reserved).
const PRIVATE_IPV4_RANGES = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
];

function isPrivateIPv4(ip) {
  const long = ipv4ToLong(ip);
  return PRIVATE_IPV4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (long & mask) === (ipv4ToLong(base) & mask);
  });
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === "::1") return true;
  if (/^f[cd]/.test(lower)) return true; // fc00::/7 (unique local)
  if (/^fe[89ab]/.test(lower)) return true; // fe80::/10 (link-local)
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

// Validates the protocol and rejects hosts that resolve to private/loopback/
// link-local addresses (including the cloud metadata endpoint), to prevent
// the server-side scraper from being used to probe internal network services.
export async function assertSafeUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("URL invalide.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Seules les URLs en https sont autorisées.");
  }

  if (parsed.hostname === "localhost") {
    throw new Error("Cette adresse n'est pas autorisée.");
  }

  let addresses;
  try {
    addresses = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Impossible de résoudre cette adresse.");
  }

  for (const { address, family } of addresses) {
    if (family === 4 && isPrivateIPv4(address)) {
      throw new Error("Cette adresse n'est pas autorisée.");
    }
    if (family === 6 && isPrivateIPv6(address)) {
      throw new Error("Cette adresse n'est pas autorisée.");
    }
  }

  return parsed;
}
