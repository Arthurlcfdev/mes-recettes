// One-off migration: adds recipes.deleted_at for soft-delete.
// Run once: node scripts/add-deleted-at-column.js

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

(async () => {
  await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS deleted_at timestamptz;`;
  console.log("OK: recipes.deleted_at ajoutée (ou déjà existante).");
})();
