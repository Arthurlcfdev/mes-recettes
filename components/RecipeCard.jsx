import styles from "./RecipeCard.module.css";
import { colorFromName } from "../lib/recipeUtils";

export default function RecipeCard({ recipe, onClick, onLike }) {
  return (
    <div className={styles.card}>
      <div className={styles.stripe} style={{ background: colorFromName(recipe.name) }} />
      <div className={styles.body} onClick={onClick}>
        <h3 className={styles.title}>{recipe.name}</h3>
        {recipe.description && <p className={styles.description}>{recipe.description}</p>}
        <div className={styles.meta}>
          {recipe.prepTime && <span>⏱ {recipe.prepTime}</span>}
          {recipe.cookTime && <span>🔥 {recipe.cookTime}</span>}
          <span>👥 {recipe.servings} pers.</span>
          <span>📋 {recipe.ingredients.length} ingr.</span>
        </div>
      </div>
      <div className={styles.footer}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike(recipe.id);
          }}
          className={
            recipe.liked ? `${styles.likeButton} ${styles.likeButtonActive}` : styles.likeButton
          }
          title={recipe.liked ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          {recipe.liked ? "♥" : "♡"}
        </button>
      </div>
    </div>
  );
}
