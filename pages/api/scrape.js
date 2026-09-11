import { assertSafeUrl } from "../../lib/ssrf";
import { extractRecipeData, buildRecipe } from "../../lib/parseRecipe";

const FETCH_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 3 * 1024 * 1024; // 3 Mo

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
      const err = new Error("Page trop volumineuse.");
      err.code = "TOO_LARGE";
      throw err;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL manquante" });

  let safeUrl;
  try {
    safeUrl = await assertSafeUrl(url);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

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

    if (!response.ok) {
      return res
        .status(502)
        .json({ error: `Impossible d'accéder à cette page (${response.status})` });
    }

    const html = await readBodyWithLimit(response, MAX_RESPONSE_BYTES);

    const recipeData = extractRecipeData(html);
    if (!recipeData) {
      return res.status(422).json({
        error:
          "Ce site ne supporte pas le format Recipe structuré. Essayez Marmiton, AllRecipes, 750g, BBC Good Food, ou Jow.",
      });
    }

    const recipe = buildRecipe(recipeData);

    if (!recipe.ingredients.length) {
      return res
        .status(422)
        .json({ error: "Recette trouvée mais sans liste d'ingrédients exploitable." });
    }

    return res.status(200).json(recipe);
  } catch (err) {
    console.error("scrape error:", err);
    if (err.code === "TOO_LARGE") {
      return res.status(422).json({ error: "Page trop volumineuse." });
    }
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Le site met trop de temps à répondre." });
    }
    return res.status(500).json({ error: "Erreur lors de l'extraction de la recette." });
  } finally {
    clearTimeout(timeout);
  }
}
