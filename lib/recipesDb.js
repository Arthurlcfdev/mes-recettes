import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL);

// Reconstructs the flat recipe shape the UI expects: real columns (id, name,
// sourceUrl, liked, addedAt) plus whatever was stored in the JSONB `data` blob
// (description, servings, prepTime, cookTime, ingredients, steps).
function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    sourceUrl: row.source_url || "",
    liked: row.liked,
    addedAt: new Date(row.created_at).getTime(),
    ...row.data,
  };
}

export async function listRecipes() {
  const rows = await sql`SELECT * FROM recipes ORDER BY created_at DESC`;
  return rows.map(mapRow);
}

export async function insertRecipe({
  name,
  sourceUrl,
  description,
  servings,
  prepTime,
  cookTime,
  ingredients,
  steps,
}) {
  const data = { description, servings, prepTime, cookTime, ingredients, steps };
  const rows = await sql`
    INSERT INTO recipes (name, source_url, data)
    VALUES (${name}, ${sourceUrl}, ${JSON.stringify(data)}::jsonb)
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function setRecipeLiked(id, liked) {
  const rows = await sql`
    UPDATE recipes SET liked = ${liked} WHERE id = ${id} RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}
