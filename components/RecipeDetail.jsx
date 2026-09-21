import { useState, useEffect } from "react";
import styles from "./RecipeDetail.module.css";
import { adjustQty, colorFromName } from "../lib/recipeUtils";

export default function RecipeDetail({ recipe, onBack, onLike }) {
  const [servings, setServings] = useState(recipe.servings || 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when navigating to a different recipe
  useEffect(() => setServings(recipe.servings || 4), [recipe.id]);

  const metaItems = [
    recipe.prepTime && { label: "Préparation", value: recipe.prepTime },
    recipe.cookTime && { label: "Cuisson", value: recipe.cookTime },
    { label: "Portions", isServings: true },
  ].filter(Boolean);

  return (
    <div className={styles.wrap}>
      <div className={styles.actions}>
        <button onClick={onBack} className={styles.backButton}>
          ← Retour
        </button>
        <button
          onClick={() => onLike(recipe.id)}
          className={
            recipe.liked ? `${styles.likeButton} ${styles.likeButtonActive}` : styles.likeButton
          }
        >
          {recipe.liked ? "♥ Sauvegardée" : "♡ Sauvegarder"}
        </button>
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sourceLink}
          >
            Voir la source ↗
          </a>
        )}
      </div>

      {recipe.image ? (
        <img
          src={recipe.image}
          alt=""
          className={styles.heroImage}
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ) : (
        <div className={styles.stripe} style={{ background: colorFromName(recipe.name) }} />
      )}
      <h1 className={styles.title}>{recipe.name}</h1>
      {recipe.description && <p className={styles.description}>{recipe.description}</p>}

      <div className={styles.metaStrip}>
        {metaItems.map((item, i) => (
          <div key={i} className={styles.metaItem}>
            <div className={styles.metaLabel}>{item.label}</div>
            {item.isServings ? (
              <div className={styles.servingsControl}>
                <button
                  onClick={() => setServings((s) => Math.max(1, s - 1))}
                  className={styles.qtyBtn}
                >
                  −
                </button>
                <span className={styles.servingsValue}>{servings}</span>
                <button onClick={() => setServings((s) => s + 1)} className={styles.qtyBtn}>
                  +
                </button>
              </div>
            ) : (
              <div className={styles.metaValue}>{item.value}</div>
            )}
          </div>
        ))}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Ingrédients</h2>
        <ul className={styles.ingredientList}>
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className={styles.ingredientRow}>
              <span className={styles.ingredientQty}>
                {adjustQty(ing.quantity, recipe.servings, servings)}
                {ing.unit ? ` ${ing.unit}` : ""}
              </span>
              <span className={styles.ingredientName}>{ing.name}</span>
            </li>
          ))}
        </ul>
      </section>

      {recipe.steps?.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Préparation</h2>
          <ol className={styles.stepList}>
            {recipe.steps.map((step, i) => (
              <li key={i} className={styles.stepRow}>
                <span className={styles.stepNumber}>{i + 1}</span>
                <p className={styles.stepText}>{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
