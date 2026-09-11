import { listRecipes, insertRecipe } from "../../../lib/recipesDb";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const recipes = await listRecipes();
      return res.status(200).json(recipes);
    } catch (err) {
      console.error("GET /api/recipes error:", err);
      return res.status(500).json({ error: "Impossible de charger les recettes." });
    }
  }

  if (req.method === "POST") {
    const { name, sourceUrl, description, servings, prepTime, cookTime, ingredients, steps } =
      req.body || {};
    if (!name || !Array.isArray(ingredients) || !ingredients.length) {
      return res.status(400).json({ error: "Recette invalide." });
    }
    try {
      const recipe = await insertRecipe({
        name,
        sourceUrl,
        description,
        servings,
        prepTime,
        cookTime,
        ingredients,
        steps,
      });
      return res.status(201).json(recipe);
    } catch (err) {
      console.error("POST /api/recipes error:", err);
      return res.status(500).json({ error: "Impossible d'enregistrer la recette." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
