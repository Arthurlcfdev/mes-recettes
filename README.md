# 📖 Mes Recettes

Application web gratuite pour sauvegarder, organiser et générer des listes de courses à partir de tes recettes préférées.

## Sites compatibles

Marmiton · AllRecipes · 750g · BBC Good Food · Jow · Cuisineaz · Ricardo · Food Network · Epicurious · et la plupart des grands sites de recettes.

## Installation (5 minutes)

**Prérequis :** Node.js installé → https://nodejs.org

```bash
# 1. Installer les dépendances
cd mes-recettes
npm install

# 2. Lancer en local
npm run dev
# → Ouvrir http://localhost:3000
```

## Déploiement sur Vercel (gratuit, accès depuis ton téléphone)

```bash
# 1. Créer un compte sur https://vercel.com (gratuit)

# 2. Installer l'outil Vercel
npm install -g vercel

# 3. Déployer depuis le dossier du projet
vercel

# → Vercel te donne une URL publique (ex: mes-recettes-xyz.vercel.app)
# → Accessible depuis n'importe quel appareil !
```

## Fonctionnalités

- Ajouter une recette depuis une URL (scraping JSON-LD, sans API payante)
- Liker et retrouver ses recettes favorites
- Vue détail avec ajustement des portions (quantités recalculées automatiquement)
- Générer une liste de courses fusionnée pour plusieurs recettes
- Télécharger la liste en .txt

## Stockage

Les recettes sont sauvegardées dans le `localStorage` du navigateur — aucune base de données, 100% gratuit.
