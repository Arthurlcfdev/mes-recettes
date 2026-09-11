import styles from "./Header.module.css";

export default function Header({ view, setView, likedCount }) {
  const tabs = [
    { id: "home", label: "Toutes" },
    { id: "liked", label: likedCount > 0 ? `♥ ${likedCount}` : "♥ Favoris" },
    { id: "shopping", label: "🛒 Courses" },
  ];
  return (
    <div className={styles.header}>
      <span onClick={() => setView("home")} className={styles.logo}>
        📖 Mes Recettes
      </span>
      <div className={styles.tabs}>
        {tabs.map((t) => {
          const active = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={active ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
