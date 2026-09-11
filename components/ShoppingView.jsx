import { useState } from "react";
import styles from "./ShoppingView.module.css";
import { adjustQty } from "../lib/recipeUtils";

export default function ShoppingView({ recipes }) {
  const [selected, setSelected] = useState({});
  const [portions, setPortions] = useState({});
  const [copied, setCopied] = useState(false);

  const toggle = (id) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
    const recipe = recipes.find((r) => r.id === id);
    if (recipe && !portions[id]) setPortions((p) => ({ ...p, [id]: recipe.servings || 4 }));
  };

  const selectedRecipes = recipes.filter((r) => selected[r.id]);

  const merged = {};
  selectedRecipes.forEach((recipe) => {
    const p = portions[recipe.id] || recipe.servings;
    recipe.ingredients.forEach((ing) => {
      const key = ing.name.toLowerCase().trim();
      if (!merged[key]) merged[key] = { name: ing.name, items: [] };
      merged[key].items.push({
        qty: adjustQty(ing.quantity, recipe.servings, p),
        unit: ing.unit,
        recipe: recipe.name,
      });
    });
  });

  const copyList = () => {
    const lines = [
      ...Object.values(merged).map((item) => {
        const parts = item.items.map(
          (i) =>
            `${i.qty}${i.unit ? " " + i.unit : ""}${item.items.length > 1 ? " (" + i.recipe + ")" : ""}`,
        );
        return `${item.name} : ${parts.join(" + ")}`;
      }),
      "",
      "Plats",
      ...selectedRecipes.map((r) => `${r.name} (${portions[r.id] || r.servings} pers.)`),
    ].join("\n");

    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (!recipes.length)
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🛒</div>
        <p>Ajoutez d&apos;abord des recettes depuis l&apos;onglet &quot;Toutes&quot;.</p>
      </div>
    );

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Liste de courses</h1>
      <p className={styles.subtitle}>
        Cochez les recettes et ajustez les portions pour générer votre liste.
      </p>

      <div className={styles.grid}>
        {recipes.map((recipe) => {
          const isSelected = !!selected[recipe.id];
          const p = portions[recipe.id] || recipe.servings;
          return (
            <div
              key={recipe.id}
              onClick={() => toggle(recipe.id)}
              className={
                isSelected ? `${styles.recipeTile} ${styles.recipeTileSelected}` : styles.recipeTile
              }
            >
              <div className={styles.tileHeader}>
                <span className={styles.tileName}>{recipe.name}</span>
                <span
                  className={
                    isSelected
                      ? `${styles.tileCheck} ${styles.tileCheckSelected}`
                      : styles.tileCheck
                  }
                >
                  {isSelected ? "✓" : "○"}
                </span>
              </div>
              {isSelected && (
                <div className={styles.portionsRow} onClick={(e) => e.stopPropagation()}>
                  <span className={styles.portionsLabel}>Portions :</span>
                  <button
                    onClick={() =>
                      setPortions((prev) => ({ ...prev, [recipe.id]: Math.max(1, p - 1) }))
                    }
                    className={styles.portionBtn}
                  >
                    −
                  </button>
                  <span className={styles.portionsValue}>{p}</span>
                  <button
                    onClick={() => setPortions((prev) => ({ ...prev, [recipe.id]: p + 1 }))}
                    className={styles.portionBtn}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedRecipes.length > 0 ? (
        <div className={styles.summary}>
          <div className={styles.summaryHeader}>
            <h2 className={styles.summaryTitle}>
              Ingrédients — {selectedRecipes.length} recette
              {selectedRecipes.length > 1 ? "s" : ""}
            </h2>
            <button onClick={copyList} className={styles.downloadBtn}>
              {copied ? "✓ Copié !" : "⧉ Copier"}
            </button>
          </div>

          <div className={styles.chips}>
            {selectedRecipes.map((r) => (
              <span key={r.id} className={styles.chip}>
                {r.name} · {portions[r.id] || r.servings} pers.
              </span>
            ))}
          </div>

          <ul className={styles.ingredientList}>
            {Object.values(merged).map((item, i) => (
              <li key={i} className={styles.ingredientRow}>
                <div className={styles.ingredientLeft}>
                  <span className={styles.checkbox} />
                  <span className={styles.ingredientName}>{item.name}</span>
                </div>
                <div className={styles.ingredientRight}>
                  {item.items.map((it, j) => (
                    <div key={j} className={styles.ingredientDetail}>
                      <span className={styles.ingredientQty}>
                        {it.qty}
                        {it.unit ? ` ${it.unit}` : ""}
                      </span>
                      {item.items.length > 1 && (
                        <span className={styles.ingredientSource}> ({it.recipe})</span>
                      )}
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className={styles.noSelection}>Sélectionnez au moins une recette ci-dessus.</div>
      )}
    </div>
  );
}
