// One-off backfill: fetches the JSON-LD `image` for existing recipes that
// don't have one yet, and stores it in the `data` JSONB blob.
// Dry run (default): node scripts/backfill-recipe-images.js
// Apply:              node scripts/backfill-recipe-images.js --apply

const fs = require("fs");
const path = require("path");
const dns = require("dns/promises");
const { neon } = require("@neondatabase/serverless");

const envPath = path.join(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^([\w.-]+)\s*=\s*(.*)?$/);
  if (match) {
    const key = match[1];
    const value = (match[2] || "").trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const sql = neon(process.env.POSTGRES_URL);
const apply = process.argv.includes("--apply");

const FETCH_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 3 * 1024 * 1024; // 3 Mo

// ── SSRF guard (mirrors lib/ssrf.js) ──
function ipv4ToLong(ip) {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

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
  if (/^f[cd]/.test(lower)) return true;
  if (/^fe[89ab]/.test(lower)) return true;
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

async function assertSafeUrl(rawUrl) {
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

async function readBodyWithLimit(response, maxBytes) {
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      reader.cancel();
      throw new Error("Page trop volumineuse.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function parseImage(image) {
  if (!image) return null;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return parseImage(image[0]);
  if (typeof image === "object") return image.url || null;
  return null;
}

function extractRecipeImage(html) {
  const ldJsonMatches = [
    ...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];

  for (const match of ldJsonMatches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of candidates) {
        const nodes = item["@graph"] ? item["@graph"] : [item];
        for (const node of nodes) {
          if (
            node["@type"] === "Recipe" ||
            (Array.isArray(node["@type"]) && node["@type"].includes("Recipe"))
          ) {
            return parseImage(node.image);
          }
        }
      }
    } catch {
      // ignore malformed JSON-LD blocks and keep scanning
    }
  }

  return null;
}

async function fetchImageForUrl(sourceUrl) {
  const safeUrl = await assertSafeUrl(sourceUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(safeUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RecipeBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await readBodyWithLimit(response, MAX_RESPONSE_BYTES);
    return extractRecipeImage(html);
  } finally {
    clearTimeout(timeout);
  }
}

(async () => {
  const rows = await sql`
    SELECT id, name, source_url
    FROM recipes
    WHERE source_url IS NOT NULL AND (data->>'image') IS NULL
    ORDER BY created_at ASC
  `;

  if (!rows.length) {
    console.log("Aucune recette sans image à traiter.");
    return;
  }

  console.log(`${rows.length} recette(s) à traiter${apply ? "" : " (dry-run)"}...`);

  const updates = [];
  for (const row of rows) {
    try {
      const image = await fetchImageForUrl(row.source_url);
      console.log(`  - [${row.id}] "${row.name}": ${image || "(aucune image trouvée)"}`);
      if (image) updates.push({ id: row.id, image });
    } catch (err) {
      console.log(`  - [${row.id}] "${row.name}": erreur (${err.message})`);
    }
  }

  if (!apply) {
    console.log(
      `\nDry-run : ${updates.length} image(s) seraient enregistrées. Relancez avec --apply pour confirmer.`,
    );
    return;
  }

  for (const { id, image } of updates) {
    await sql`UPDATE recipes SET data = data || jsonb_build_object('image', ${image}::text) WHERE id = ${id}`;
  }
  console.log(`\n${updates.length} recette(s) mise(s) à jour.`);
})();
