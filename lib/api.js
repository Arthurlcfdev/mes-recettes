export async function getRecipes() {
  const res = await fetch("/api/recipes");
  if (!res.ok) throw new Error("Impossible de charger vos recettes.");
  return res.json();
}

export async function createRecipe(fields) {
  const res = await fetch("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur inconnue");
  return data;
}

export async function setLiked(id, liked) {
  const res = await fetch(`/api/recipes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ liked }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur inconnue");
  return data;
}

export async function scrapeRecipe(url) {
  const res = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur inconnue");
  return data;
}
