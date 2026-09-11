import { loadData } from "./storage";

const MIGRATED_FLAG = "recipebook_v1_migrated";

export function getLegacyRecipes() {
  return loadData().recipes || [];
}

export function isMigrated() {
  try {
    return localStorage.getItem(MIGRATED_FLAG) === "1";
  } catch {
    return true;
  }
}

export function markMigrated() {
  try {
    localStorage.setItem(MIGRATED_FLAG, "1");
  } catch {}
}
