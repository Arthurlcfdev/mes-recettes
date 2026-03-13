export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL manquante" });

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RecipeBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) throw new Error(`Impossible d'accéder à cette page (${response.status})`);

    const html = await response.text();

    // ── Extract all JSON-LD blocks ──
    const ldJsonMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    
    let recipeData = null;

    for (const match of ldJsonMatches) {
      try {
        const parsed = JSON.parse(match[1].trim());
        const candidates = Array.isArray(parsed) ? parsed : [parsed];
        
        // Handle @graph arrays
        for (const item of candidates) {
          const nodes = item["@graph"] ? item["@graph"] : [item];
          for (const node of nodes) {
            if (node["@type"] === "Recipe" || 
                (Array.isArray(node["@type"]) && node["@type"].includes("Recipe"))) {
              recipeData = node;
              break;
            }
          }
          if (recipeData) break;
        }
        if (recipeData) break;
      } catch {}
    }

    if (!recipeData) {
      return res.status(422).json({
        error: "Ce site ne supporte pas le format Recipe structuré. Essayez Marmiton, AllRecipes, 750g, BBC Good Food, ou Jow.",
      });
    }

    // ── Parse ISO 8601 duration ──
    function parseDuration(iso) {
      if (!iso) return null;
      const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      if (!match) return null;
      const h = parseInt(match[1] || 0);
      const m = parseInt(match[2] || 0);
      if (h && m) return `${h}h${String(m).padStart(2, "0")}`;
      if (h) return `${h}h`;
      if (m) return `${m} min`;
      return null;
    }

    // ── Parse servings ──
    function parseServings(val) {
      if (!val) return 4;
      if (typeof val === "number") return val;
      const str = String(val);
      const m = str.match(/\d+/);
      return m ? parseInt(m[0]) : 4;
    }

    // ── Parse ingredient string → {quantity, unit, name} ──
    const UNITS = [
      "kg","g","mg","l","cl","ml","dl",
      "càs","càc","c\\.à\\.s\\.","c\\.à\\.c\\.",
      "tbsp","tsp","cup","cups","oz","lb","lbs",
      "litre","litres","liter","liters",
      "pincée","pincées","poignée","poignées",
      "tranche","tranches","morceau","morceaux",
      "filet","branche","branches","brin","brins",
      "gousse","gousses","tête","têtes",
      "sachet","sachets","boîte","boîtes",
    ];
    const UNIT_RE = new RegExp(
      `^(\\d+(?:[.,/]\\d+)?)\\s*(${UNITS.join("|")})\\s*(?:de\\s+|d'|du\\s+|des\\s+|de la\\s+)?(.+)$`,
      "i"
    );
    const QTY_RE = /^(\d+(?:[.,/]\d+)?)\s+(.+)$/;

    function parseIngredient(str) {
      if (!str) return { quantity: "", unit: "", name: str || "" };
      const clean = str.trim().replace(/\u00BD/g, "1/2").replace(/\u00BC/g, "1/4").replace(/\u00BE/g, "3/4");
      
      const m1 = clean.match(UNIT_RE);
      if (m1) return { quantity: m1[1].replace(",", "."), unit: m1[2], name: m1[3].trim() };
      
      const m2 = clean.match(QTY_RE);
      if (m2) return { quantity: m2[1], unit: "", name: m2[2].replace(/^(?:de |d'|du |des |de la )/i, "").trim() };
      
      return { quantity: "", unit: "", name: clean };
    }

    // ── Parse instructions ──
    function parseSteps(instructions) {
      if (!instructions) return [];
      if (typeof instructions === "string") return [instructions];
      if (Array.isArray(instructions)) {
        return instructions.map((step) => {
          if (typeof step === "string") return step;
          return step.text || step.name || String(step);
        }).filter(Boolean);
      }
      return [];
    }

    const recipe = {
      name: recipeData.name || "Recette sans nom",
      description: Array.isArray(recipeData.description) ? recipeData.description.join(" ") : (recipeData.description || ""),
      servings: parseServings(recipeData.recipeYield),
      prepTime: parseDuration(recipeData.prepTime),
      cookTime: parseDuration(recipeData.cookTime),
      ingredients: (recipeData.recipeIngredient || []).map(parseIngredient),
      steps: parseSteps(recipeData.recipeInstructions),
    };

    if (!recipe.ingredients.length) {
      return res.status(422).json({ error: "Recette trouvée mais sans liste d'ingrédients exploitable." });
    }

    return res.status(200).json(recipe);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Erreur lors de l'extraction de la recette." });
  }
}
