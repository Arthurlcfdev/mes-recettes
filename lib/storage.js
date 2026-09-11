const STORAGE_KEY = "recipebook_v1";

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { recipes: [] };
  } catch {
    return { recipes: [] };
  }
}
