import { listRecipes, insertRecipe, findRecipeBySourceUrl } from "../../../lib/recipesDb";

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
    const {
      name,
      sourceUrl,
      description,
      servings,
      prepTime,
      cookTime,
      ingredients,
      steps,
      image,
    } = req.body || {};
    if (!name || !Array.isArray(ingredients) || !ingredients.length) {
      return res.status(400).json({ error: "Recette invalide." });
    }
    try {
      if (sourceUrl) {
        const existing = await findRecipeBySourceUrl(sourceUrl);
        if (existing) {
          return res.status(409).json({
            error: existing.deletedAt
              ? `Cette recette a déjà été ajoutée puis supprimée : "${existing.name}". Restaurez-la depuis "Recettes supprimées" plutôt que de l'ajouter à nouveau.`
              : `Cette recette existe déjà : "${existing.name}".`,
          });
        }
      }
      const recipe = await insertRecipe({
        name,
        sourceUrl,
        description,
        servings,
        prepTime,
        cookTime,
        ingredients,
        steps,
        image,
      });
      return res.status(201).json(recipe);
    } catch (err) {
      console.error("POST /api/recipes error:", err);
      return res.status(500).json({ error: "Impossible d'enregistrer la recette." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
