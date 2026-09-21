// One-off cleanup: removes duplicate recipes (same normalized source_url),
// keeping one exemplar per URL (an active one if there is one, else the oldest).
// Dry run (default): node scripts/remove-duplicate-recipes.js
// Apply:              node scripts/remove-duplicate-recipes.js --apply

const fs = require("fs");
const path = require("path");
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

function normalizeUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const p = u.pathname.replace(/\/+$/, "") || "/";
    return `${host}${p}`;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

(async () => {
  const rows = await sql`
    SELECT id, name, source_url, deleted_at, created_at
    FROM recipes
    WHERE source_url IS NOT NULL
    ORDER BY created_at ASC
  `;

  const groups = new Map();
  for (const row of rows) {
    const key = normalizeUrl(row.source_url);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const toDelete = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const active = group.filter((r) => !r.deleted_at);
    const keep = (active.length ? active : group)[0]; // earliest created_at (rows already sorted asc)
    for (const row of group) {
      if (row.id !== keep.id) toDelete.push(row);
    }
  }

  if (!toDelete.length) {
    console.log("Aucun doublon trouvé.");
    return;
  }

  console.log(`${toDelete.length} recette(s) en double trouvée(s) :`);
  for (const row of toDelete) {
    console.log(
      `  - [${row.id}] "${row.name}" (${row.source_url})${row.deleted_at ? " [déjà supprimée]" : ""}`,
    );
  }

  if (!apply) {
    console.log("\nDry-run : aucune suppression effectuée. Relancez avec --apply pour confirmer.");
    return;
  }

  const ids = toDelete.map((r) => r.id);
  await sql`DELETE FROM recipes WHERE id = ANY(${ids})`;
  console.log(`\n${ids.length} recette(s) supprimée(s) définitivement.`);
})();
