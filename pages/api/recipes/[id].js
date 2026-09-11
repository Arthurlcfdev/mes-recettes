import { setRecipeLiked, setRecipeDeleted } from "../../../lib/recipesDb";

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query;
  const { liked, deleted } = req.body || {};
  if (typeof liked !== "boolean" && typeof deleted !== "boolean") {
    return res.status(400).json({ error: "liked ou deleted doit être un booléen." });
  }

  try {
    const recipe =
      typeof deleted === "boolean"
        ? await setRecipeDeleted(id, deleted)
        : await setRecipeLiked(id, liked);
    if (!recipe) return res.status(404).json({ error: "Recette introuvable." });
    return res.status(200).json(recipe);
  } catch (err) {
    console.error("PATCH /api/recipes/[id] error:", err);
    return res.status(500).json({ error: "Impossible de mettre à jour la recette." });
  }
}
