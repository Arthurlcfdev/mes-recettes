import { useState } from "react";
import { useRouter } from "next/router";
import styles from "./login.module.css";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Mot de passe incorrect.");
        return;
      }
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <form onSubmit={handleSubmit} className={styles.card}>
        <h1 className={styles.title}>📖 Mes Recettes</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          autoFocus
          className={styles.input}
        />
        <button
          type="submit"
          disabled={loading || !password}
          className={
            loading || !password ? `${styles.submit} ${styles.submitDisabled}` : styles.submit
          }
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </div>
  );
}
