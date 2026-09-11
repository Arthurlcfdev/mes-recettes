import { setRecipeLiked } from "../../../lib/recipesDb";

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query;
  const { liked } = req.body || {};
  if (typeof liked !== "boolean") {
    return res.status(400).json({ error: "liked doit être un booléen." });
  }

  try {
    const recipe = await setRecipeLiked(id, liked);
    if (!recipe) return res.status(404).json({ error: "Recette introuvable." });
    return res.status(200).json(recipe);
  } catch (err) {
    console.error("PATCH /api/recipes/[id] error:", err);
    return res.status(500).json({ error: "Impossible de mettre à jour la recette." });
  }
}
