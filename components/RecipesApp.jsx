import { useState, useEffect, useCallback } from "react";

const T = {
  bg: "#F9F6F1",
  card: "#FFFFFF",
  primary: "#B8481A",
  primaryLight: "#FAE8DB",
  accent: "#E8A87C",
  text: "#1C1612",
  textMuted: "#7A6A60",
  border: "rgba(0,0,0,0.09)",
  shadow: "0 2px 14px rgba(0,0,0,0.06)",
  serif: "Georgia, 'Palatino Linotype', serif",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const STORAGE_KEY = "recipebook_v1";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { recipes: [] };
  } catch { return { recipes: [] }; }
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

async function extractRecipe(url) {
  const res = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur inconnue");
  return data;
}

const genId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

function adjustQty(qty, base, current) {
  if (!qty || isNaN(parseFloat(qty))) return qty || "";
  const num = parseFloat(qty);
  const adjusted = num * (current / base);
  if (adjusted % 1 === 0) return String(Math.round(adjusted));
  return parseFloat(adjusted < 1 ? adjusted.toFixed(2) : adjusted.toFixed(1)).toString();
}

function colorFromName(name) {
  const hues = [16, 40, 160, 200, 260, 300];
  return `hsl(${hues[name.charCodeAt(0) % hues.length]}, 55%, 62%)`;
}

const btnRound = (size = 26) => ({
  width: size, height: size, borderRadius: "50%",
  border: `1.5px solid ${T.primary}`, background: "white",
  color: T.primary, cursor: "pointer", fontSize: 14,
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 0, lineHeight: 1, flexShrink: 0,
});

// ── Header ────────────────────────────────────────────────
function Header({ view, setView, likedCount }) {
  const tabs = [
    { id: "home", label: "Toutes" },
    { id: "liked", label: likedCount > 0 ? `♥ ${likedCount}` : "♥ Favoris" },
    { id: "shopping", label: "🛒 Courses" },
  ];
  return (
    <div style={{
      background: T.card, borderBottom: `1px solid ${T.border}`,
      padding: "0 20px", display: "flex", alignItems: "center",
      justifyContent: "space-between", height: 58,
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <span onClick={() => setView("home")} style={{
        fontFamily: T.serif, fontSize: 21, color: T.primary,
        cursor: "pointer", fontWeight: 600, letterSpacing: "-0.02em",
      }}>
        📖 Mes Recettes
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        {tabs.map((t) => {
          const active = view === t.id;
          return (
            <button key={t.id} onClick={() => setView(t.id)} style={{
              padding: "5px 14px",
              border: `1px solid ${active ? T.primary : T.border}`,
              borderRadius: 20,
              background: active ? T.primaryLight : "transparent",
              color: active ? T.primary : T.textMuted,
              fontSize: 13, cursor: "pointer", fontFamily: T.sans,
              fontWeight: active ? 600 : 400,
            }}>
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Recipe Card ───────────────────────────────────────────
function RecipeCard({ recipe, onClick, onLike }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: T.card, borderRadius: 12,
        border: `1.5px solid ${hover ? T.accent : T.border}`,
        overflow: "hidden", cursor: "pointer",
        boxShadow: hover ? "0 6px 20px rgba(0,0,0,0.1)" : T.shadow,
        transform: hover ? "translateY(-2px)" : "none",
        transition: "all 0.18s",
      }}
    >
      <div style={{ height: 5, background: colorFromName(recipe.name) }} />
      <div style={{ padding: "16px 18px" }} onClick={onClick}>
        <h3 style={{
          fontFamily: T.serif, fontSize: 16, color: T.text,
          fontWeight: 600, lineHeight: 1.35, marginBottom: 8,
        }}>
          {recipe.name}
        </h3>
        {recipe.description && (
          <p style={{
            fontSize: 13, color: T.textMuted, lineHeight: 1.55, marginBottom: 12,
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {recipe.description}
          </p>
        )}
        <div style={{ display: "flex", gap: 10, fontSize: 12, color: T.textMuted, flexWrap: "wrap" }}>
          {recipe.prepTime && <span>⏱ {recipe.prepTime}</span>}
          {recipe.cookTime && <span>🔥 {recipe.cookTime}</span>}
          <span>👥 {recipe.servings} pers.</span>
          <span>📋 {recipe.ingredients.length} ingr.</span>
        </div>
      </div>
      <div style={{
        borderTop: `1px solid ${T.border}`, padding: "8px 18px",
        display: "flex", alignItems: "center",
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onLike(recipe.id); }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 20, color: recipe.liked ? "#E04455" : "#ccc",
            padding: "2px 4px", lineHeight: 1,
          }}
          title={recipe.liked ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          {recipe.liked ? "♥" : "♡"}
        </button>
      </div>
    </div>
  );
}

// ── Recipe Detail ─────────────────────────────────────────
function RecipeDetail({ recipe, onBack, onLike }) {
  const [servings, setServings] = useState(recipe.servings || 4);
  useEffect(() => setServings(recipe.servings || 4), [recipe.id]);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px 60px", fontFamily: T.sans }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0 18px", flexWrap: "wrap" }}>
        <button onClick={onBack} style={{
          background: "none", border: `1px solid ${T.border}`, borderRadius: 8,
          padding: "6px 14px", cursor: "pointer", color: T.textMuted, fontSize: 14,
        }}>← Retour</button>
        <button onClick={() => onLike(recipe.id)} style={{
          background: recipe.liked ? "#FEE8EB" : "none",
          border: `1px solid ${recipe.liked ? "#E04455" : T.border}`, borderRadius: 8,
          padding: "6px 14px", cursor: "pointer",
          color: recipe.liked ? "#E04455" : T.textMuted, fontSize: 14,
        }}>
          {recipe.liked ? "♥ Sauvegardée" : "♡ Sauvegarder"}
        </button>
        {recipe.sourceUrl && (
          <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer"
            style={{ marginLeft: "auto", fontSize: 13, color: T.primary, textDecoration: "none" }}>
            Voir la source ↗
          </a>
        )}
      </div>

      <div style={{ height: 4, background: colorFromName(recipe.name), borderRadius: 2, marginBottom: 20 }} />
      <h1 style={{ fontFamily: T.serif, fontSize: 30, color: T.text, marginBottom: 10, lineHeight: 1.2 }}>
        {recipe.name}
      </h1>
      {recipe.description && (
        <p style={{ fontSize: 16, color: T.textMuted, lineHeight: 1.65, marginBottom: 22 }}>
          {recipe.description}
        </p>
      )}

      {/* Meta strip */}
      <div style={{
        display: "flex", background: T.primaryLight, borderRadius: 10,
        marginBottom: 30, overflow: "hidden",
      }}>
        {[
          recipe.prepTime && { label: "Préparation", value: recipe.prepTime },
          recipe.cookTime && { label: "Cuisson", value: recipe.cookTime },
          { label: "Portions", isServings: true },
        ].filter(Boolean).map((item, i, arr) => (
          <div key={i} style={{
            flex: 1, padding: "14px 16px", textAlign: "center",
            borderRight: i < arr.length - 1 ? `1px solid rgba(184,72,26,0.15)` : "none",
          }}>
            <div style={{ fontSize: 10, color: T.primary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
              {item.label}
            </div>
            {item.isServings ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <button onClick={() => setServings(s => Math.max(1, s - 1))} style={btnRound(22)}>−</button>
                <span style={{ fontSize: 17, color: T.text, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{servings}</span>
                <button onClick={() => setServings(s => s + 1)} style={btnRound(22)}>+</button>
              </div>
            ) : (
              <div style={{ fontSize: 16, color: T.text, fontWeight: 700 }}>{item.value}</div>
            )}
          </div>
        ))}
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{
          fontFamily: T.serif, fontSize: 22, color: T.text, marginBottom: 14,
          paddingBottom: 8, borderBottom: `2px solid ${T.primaryLight}`,
        }}>Ingrédients</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {recipe.ingredients.map((ing, i) => (
            <li key={i} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "10px 0", borderBottom: `1px solid ${T.border}`,
            }}>
              <span style={{ fontWeight: 700, color: T.primary, minWidth: 80, textAlign: "right", fontFamily: T.serif, fontSize: 15 }}>
                {adjustQty(ing.quantity, recipe.servings, servings)}
                {ing.unit ? ` ${ing.unit}` : ""}
              </span>
              <span style={{ fontSize: 15, color: T.text }}>{ing.name}</span>
            </li>
          ))}
        </ul>
      </section>

      {recipe.steps?.length > 0 && (
        <section>
          <h2 style={{
            fontFamily: T.serif, fontSize: 22, color: T.text, marginBottom: 14,
            paddingBottom: 8, borderBottom: `2px solid ${T.primaryLight}`,
          }}>Préparation</h2>
          <ol style={{ listStyle: "none", padding: 0 }}>
            {recipe.steps.map((step, i) => (
              <li key={i} style={{ display: "flex", gap: 14, marginBottom: 18 }}>
                <span style={{
                  minWidth: 28, height: 28, borderRadius: "50%",
                  background: T.primaryLight, color: T.primary,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 3,
                }}>{i + 1}</span>
                <p style={{ fontSize: 15, color: T.text, lineHeight: 1.7, margin: 0 }}>{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

// ── Shopping View ─────────────────────────────────────────
function ShoppingView({ recipes }) {
  const [selected, setSelected] = useState({});
  const [portions, setPortions] = useState({});

  const toggle = (id) => {
    setSelected(s => ({ ...s, [id]: !s[id] }));
    const recipe = recipes.find(r => r.id === id);
    if (recipe && !portions[id]) setPortions(p => ({ ...p, [id]: recipe.servings || 4 }));
  };

  const selectedRecipes = recipes.filter(r => selected[r.id]);

  const merged = {};
  selectedRecipes.forEach(recipe => {
    const p = portions[recipe.id] || recipe.servings;
    recipe.ingredients.forEach(ing => {
      const key = ing.name.toLowerCase().trim();
      if (!merged[key]) merged[key] = { name: ing.name, items: [] };
      merged[key].items.push({
        qty: adjustQty(ing.quantity, recipe.servings, p),
        unit: ing.unit,
        recipe: recipe.name,
      });
    });
  });

  const downloadList = () => {
    const lines = [
      "LISTE DE COURSES",
      "════════════════",
      "",
      "Recettes :",
      ...selectedRecipes.map(r => `  • ${r.name} (${portions[r.id] || r.servings} pers.)`),
      "",
      "Ingrédients :",
      "",
      ...Object.values(merged).map(item => {
        const parts = item.items.map(i => `${i.qty}${i.unit ? " " + i.unit : ""}${item.items.length > 1 ? " (" + i.recipe + ")" : ""}`);
        return `  ☐  ${item.name} : ${parts.join(" + ")}`;
      }),
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: "liste-de-courses.txt",
    });
    a.click();
  };

  if (!recipes.length) return (
    <div style={{ textAlign: "center", padding: "80px 24px", color: T.textMuted, fontFamily: T.sans }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
      <p>Ajoutez d'abord des recettes depuis l'onglet "Toutes".</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "24px 20px 60px", fontFamily: T.sans }}>
      <h1 style={{ fontFamily: T.serif, fontSize: 26, color: T.text, marginBottom: 6 }}>Liste de courses</h1>
      <p style={{ color: T.textMuted, marginBottom: 24, fontSize: 14 }}>
        Cochez les recettes et ajustez les portions pour générer votre liste.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, marginBottom: 28 }}>
        {recipes.map(recipe => {
          const isSelected = !!selected[recipe.id];
          const p = portions[recipe.id] || recipe.servings;
          return (
            <div key={recipe.id} onClick={() => toggle(recipe.id)} style={{
              background: isSelected ? T.primaryLight : T.card,
              border: `1.5px solid ${isSelected ? T.primary : T.border}`,
              borderRadius: 10, padding: "13px 15px", cursor: "pointer",
              transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontFamily: T.serif, fontSize: 14, color: T.text, fontWeight: 600, lineHeight: 1.3 }}>
                  {recipe.name}
                </span>
                <span style={{ fontSize: 18, color: isSelected ? T.primary : "#ccc", flexShrink: 0 }}>
                  {isSelected ? "✓" : "○"}
                </span>
              </div>
              {isSelected && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                  <span style={{ fontSize: 12, color: T.textMuted }}>Portions :</span>
                  <button onClick={() => setPortions(prev => ({ ...prev, [recipe.id]: Math.max(1, p - 1) }))} style={btnRound(20)}>−</button>
                  <span style={{ fontWeight: 700, color: T.primary, minWidth: 16, textAlign: "center", fontSize: 14 }}>{p}</span>
                  <button onClick={() => setPortions(prev => ({ ...prev, [recipe.id]: p + 1 }))} style={btnRound(20)}>+</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedRecipes.length > 0 ? (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "22px 26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: T.serif, fontSize: 20, color: T.text }}>
              Ingrédients — {selectedRecipes.length} recette{selectedRecipes.length > 1 ? "s" : ""}
            </h2>
            <button onClick={downloadList} style={{
              background: T.primary, color: "white", border: "none",
              borderRadius: 8, padding: "8px 18px", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
            }}>↓ Télécharger .txt</button>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {selectedRecipes.map(r => (
              <span key={r.id} style={{
                background: T.primaryLight, color: T.primary,
                borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600,
              }}>
                {r.name} · {portions[r.id] || r.servings} pers.
              </span>
            ))}
          </div>

          <ul style={{ listStyle: "none", padding: 0 }}>
            {Object.values(merged).map((item, i) => (
              <li key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                padding: "10px 0", borderBottom: `1px solid ${T.border}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 16, height: 16, border: `1.5px solid ${T.border}`, borderRadius: 3, flexShrink: 0, display: "inline-block" }} />
                  <span style={{ fontSize: 15, color: T.text, fontWeight: 500 }}>{item.name}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  {item.items.map((it, j) => (
                    <div key={j} style={{ fontSize: 13, color: T.textMuted }}>
                      <span style={{ fontWeight: 600, color: T.primary }}>{it.qty}{it.unit ? ` ${it.unit}` : ""}</span>
                      {item.items.length > 1 && <span style={{ fontSize: 12 }}> ({it.recipe})</span>}
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "40px 20px", color: T.textMuted, fontSize: 14 }}>
          Sélectionnez au moins une recette ci-dessus.
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("home");
  const [recipes, setRecipes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const d = loadData();
    setRecipes(d.recipes || []);
  }, []);

  const persistRecipes = useCallback((updated) => {
    setRecipes(updated);
    saveData({ recipes: updated });
  }, []);

  const handleAdd = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await extractRecipe(url.trim());
      const newRecipe = { ...data, id: genId(), sourceUrl: url.trim(), liked: false, addedAt: Date.now() };
      const updated = [newRecipe, ...recipes];
      persistRecipes(updated);
      setUrl("");
      setSelectedId(newRecipe.id);
      setView("recipe");
    } catch (e) {
      setError(e.message || "Impossible d'extraire la recette.");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = useCallback((id) => {
    persistRecipes(recipes.map(r => r.id === id ? { ...r, liked: !r.liked } : r));
  }, [recipes, persistRecipes]);

  const setView2 = (v) => {
    if (v !== "recipe") setSelectedId(null);
    setView(v);
  };

  const likedCount = recipes.filter(r => r.liked).length;
  const selectedRecipe = recipes.find(r => r.id === selectedId) || null;
  const displayedRecipes = view === "liked" ? recipes.filter(r => r.liked) : recipes;

  if (view === "recipe" && selectedRecipe) return (
    <div style={{ background: T.bg, minHeight: "100vh" }}>
      <Header view={view} setView={setView2} likedCount={likedCount} />
      <RecipeDetail
        recipe={selectedRecipe}
        onBack={() => { setView("home"); setSelectedId(null); }}
        onLike={handleLike}
      />
    </div>
  );

  if (view === "shopping") return (
    <div style={{ background: T.bg, minHeight: "100vh" }}>
      <Header view={view} setView={setView2} likedCount={likedCount} />
      <ShoppingView recipes={recipes} />
    </div>
  );

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: T.sans }}>
      <Header view={view} setView={setView2} likedCount={likedCount} />
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "24px 20px 60px" }}>

        {view === "home" && (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: "22px 24px", marginBottom: 28, boxShadow: T.shadow,
          }}>
            <h2 style={{ fontFamily: T.serif, fontSize: 19, color: T.text, marginBottom: 6 }}>
              Ajouter une recette
            </h2>
            <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 14 }}>
              Compatible avec Marmiton, AllRecipes, 750g, BBC Good Food, Jow, et la plupart des grands sites.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="url" value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                placeholder="https://www.marmiton.org/recettes/..."
                disabled={loading}
                style={{
                  flex: 1, padding: "10px 15px",
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  fontSize: 14, color: T.text, outline: "none",
                  background: loading ? "#f8f6f3" : "white",
                }}
              />
              <button onClick={handleAdd} disabled={loading || !url.trim()} style={{
                padding: "10px 22px",
                background: loading || !url.trim() ? "#ccc" : T.primary,
                color: "white", border: "none", borderRadius: 8,
                fontSize: 14, fontWeight: 600, cursor: loading || !url.trim() ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}>
                {loading ? "⏳ Extraction..." : "+ Ajouter"}
              </button>
            </div>
            {loading && <p style={{ color: T.primary, fontSize: 13, marginTop: 10 }}>Lecture de la page en cours…</p>}
            {error && <p style={{ color: "#C0392B", fontSize: 13, marginTop: 10 }}>⚠️ {error}</p>}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: T.serif, fontSize: 22, color: T.text }}>
            {view === "liked" ? `Mes favoris (${likedCount})` : `Toutes les recettes (${recipes.length})`}
          </h2>
        </div>

        {displayedRecipes.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(255px, 1fr))", gap: 16 }}>
            {displayedRecipes.map(recipe => (
              <RecipeCard
                key={recipe.id} recipe={recipe}
                onClick={() => { setSelectedId(recipe.id); setView("recipe"); }}
                onLike={handleLike}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "70px 24px" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>{view === "liked" ? "♡" : "🍽️"}</div>
            <p style={{ color: T.textMuted, fontSize: 15 }}>
              {view === "liked" ? "Aucun favori pour l'instant." : "Collez une URL pour commencer !"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
