import { useState } from "react";
import styles from "./MigrationBanner.module.css";

export default function MigrationBanner({
  legacyRecipes,
  onImportOne,
  onImportComplete,
  onIgnore,
}) {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const handleImport = async () => {
    setImporting(true);
    setError("");
    try {
      for (const recipe of legacyRecipes) {
        await onImportOne(recipe);
      }
      onImportComplete();
    } catch (e) {
      setError(e.message || "Erreur pendant l'import.");
      setImporting(false);
    }
  };

  return (
    <div className={styles.banner}>
      <span>
        {legacyRecipes.length} recette{legacyRecipes.length > 1 ? "s" : ""} trouvée
        {legacyRecipes.length > 1 ? "s" : ""} sur cet appareil — les importer ?
      </span>
      <div className={styles.actions}>
        <button onClick={handleImport} disabled={importing} className={styles.importBtn}>
          {importing ? "Import..." : "Importer"}
        </button>
        <button onClick={onIgnore} disabled={importing} className={styles.dismissBtn}>
          Ignorer
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
