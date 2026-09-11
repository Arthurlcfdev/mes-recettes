import { useState, useEffect, useCallback } from "react";
import styles from "./RecipesApp.module.css";
import Header from "./Header";
import RecipeCard from "./RecipeCard";
import RecipeDetail from "./RecipeDetail";
import ShoppingView from "./ShoppingView";
import MigrationBanner from "./MigrationBanner";
import { getRecipes, createRecipe, setLiked, scrapeRecipe } from "../lib/api";
import { getLegacyRecipes, isMigrated, markMigrated } from "../lib/legacyStorage";

export default function App() {
  const [view, setView] = useState("home");
  const [recipes, setRecipes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [legacyRecipes, setLegacyRecipes] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setRecipes(await getRecipes());
      } catch {
        setLoadError("Impossible de charger vos recettes. Réessayez plus tard.");
      } finally {
        setLoadingRecipes(false);
      }
    })();

    if (!isMigrated()) {
      const legacy = getLegacyRecipes();
      if (legacy.length) setLegacyRecipes(legacy);
      else markMigrated();
    }
  }, []);

  const handleAdd = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    try {
      const scraped = await scrapeRecipe(url.trim());
      const created = await createRecipe({ ...scraped, sourceUrl: url.trim() });
      setRecipes((prev) => [created, ...prev]);
      setUrl("");
      setSelectedId(created.id);
      setView("recipe");
    } catch (e) {
      setError(e.message || "Impossible d'extraire la recette.");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = useCallback((id) => {
    setRecipes((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, liked: !r.liked } : r));
      const target = updated.find((r) => r.id === id);
      setLiked(id, target.liked).catch(() => {
        setRecipes((cur) => cur.map((r) => (r.id === id ? { ...r, liked: !target.liked } : r)));
      });
      return updated;
    });
  }, []);

  const handleImportLegacyOne = async (legacy) => {
    const created = await createRecipe({
      name: legacy.name,
      sourceUrl: legacy.sourceUrl,
      description: legacy.description,
      servings: legacy.servings,
      prepTime: legacy.prepTime,
      cookTime: legacy.cookTime,
      ingredients: legacy.ingredients,
      steps: legacy.steps,
    });
    const final = legacy.liked ? await setLiked(created.id, true) : created;
    setRecipes((prev) => [final, ...prev]);
  };

  const handleFinishMigration = () => {
    markMigrated();
    setLegacyRecipes([]);
  };

  const setView2 = (v) => {
    if (v !== "recipe") setSelectedId(null);
    setView(v);
  };

  const migrationBanner = legacyRecipes.length > 0 && (
    <MigrationBanner
      legacyRecipes={legacyRecipes}
      onImportOne={handleImportLegacyOne}
      onImportComplete={handleFinishMigration}
      onIgnore={handleFinishMigration}
    />
  );

  const likedCount = recipes.filter((r) => r.liked).length;
  const selectedRecipe = recipes.find((r) => r.id === selectedId) || null;
  const displayedRecipes = view === "liked" ? recipes.filter((r) => r.liked) : recipes;

  if (view === "recipe" && selectedRecipe)
    return (
      <div className={styles.page}>
        <Header view={view} setView={setView2} likedCount={likedCount} />
        {migrationBanner}
        <RecipeDetail
          recipe={selectedRecipe}
          onBack={() => {
            setView("home");
            setSelectedId(null);
          }}
          onLike={handleLike}
        />
      </div>
    );

  if (view === "shopping")
    return (
      <div className={styles.page}>
        <Header view={view} setView={setView2} likedCount={likedCount} />
        {migrationBanner}
        <ShoppingView recipes={recipes} />
      </div>
    );

  return (
    <div className={styles.pageWithFont}>
      <Header view={view} setView={setView2} likedCount={likedCount} />
      {migrationBanner}
      <div className={styles.container}>
        {view === "home" && (
          <div className={styles.addCard}>
            <h2 className={styles.addTitle}>Ajouter une recette</h2>
            <p className={styles.addSubtitle}>
              Compatible avec Marmiton, AllRecipes, 750g, BBC Good Food, Jow, et la plupart des
              grands sites.
            </p>
            <div className={styles.addRow}>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="https://www.marmiton.org/recettes/..."
                disabled={loading}
                className={
                  loading ? `${styles.urlInput} ${styles.urlInputDisabled}` : styles.urlInput
                }
              />
              <button
                onClick={handleAdd}
                disabled={loading || !url.trim()}
                className={
                  loading || !url.trim()
                    ? `${styles.addButton} ${styles.addButtonDisabled}`
                    : styles.addButton
                }
              >
                {loading ? "⏳ Extraction..." : "+ Ajouter"}
              </button>
            </div>
            {loading && <p className={styles.loadingText}>Lecture de la page en cours…</p>}
            {error && <p className={styles.errorText}>⚠️ {error}</p>}
          </div>
        )}

        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {view === "liked"
              ? `Mes favoris (${likedCount})`
              : `Toutes les recettes (${recipes.length})`}
          </h2>
        </div>

        {loadingRecipes ? (
          <p className={styles.emptyText}>Chargement de vos recettes…</p>
        ) : loadError ? (
          <p className={styles.errorText}>⚠️ {loadError}</p>
        ) : displayedRecipes.length > 0 ? (
          <div className={styles.grid}>
            {displayedRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => {
                  setSelectedId(recipe.id);
                  setView("recipe");
                }}
                onLike={handleLike}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>{view === "liked" ? "♡" : "🍽️"}</div>
            <p className={styles.emptyText}>
              {view === "liked"
                ? "Aucun favori pour l'instant."
                : "Collez une URL pour commencer !"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
