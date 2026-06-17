# Mission Control Energie

Dashboard hackathon spectaculaire et robuste pour explorer les donnees energie/ecologie en France, avec un angle monde en bonus.

## Stack

- React + Vite pour l'interface multi-pages.
- GitHub Pages 100% statique depuis le dossier `docs/`.
- APIs publiques :
  - data.gouv.fr : catalogue de datasets energie, climat, emissions, gaz, electricite, renouvelables.
  - ODRE / Open Data Reseaux Energies : catalogue, donnees methane, scenarios gaz.
- Donnees pre-generees dans `public/data/energy-intel.json`, puis copiees dans `docs/data/energy-intel.json` au build.
- Fallback local embarque : si le cache JSON n'est pas disponible, les graphes et interactions restent utilisables.

## Lancer

```bash
npm install
npm run build
npm start
```

URL locale :

```text
http://127.0.0.1:4173/Projet_DATAView-Hackaton/
```

`npm run build` lance automatiquement `scripts/generate-data.mjs`, puis genere le site statique dans `docs/`.

## GitHub Pages

Dans Settings -> Pages, garder :

```text
Source: Deploy from a branch
Branch: main
Folder: /docs
```

Le workflow `.github/workflows/refresh-pages.yml` regenere les donnees et le build :

- a chaque push sur `main`,
- toutes les 6 heures,
- manuellement via `workflow_dispatch`.

## Pages

- Cockpit : KPIs, etat du cache data, carte rapide, briefing.
- Mix energie : repartition, themes ODRE, scenarios gaz.
- Production : tendances production et consommation.
- Carbone : emissions sectorielles, methane, matrice impact/complexite.
- Carte France : signaux regionaux interactifs.
- Monde : comparaison France / monde.
- Simulateur : sliders pour tester un scenario 2030.
- Data explorer : recherche locale dans le cache data.gouv.fr + ODRE.
- Sources : constellation des familles de donnees et strategie anti-bug.

## Donnees

```text
public/data/energy-intel.json
docs/data/energy-intel.json
```

Il n'y a pas de backend a heberger. GitHub Actions appelle les APIs publiques, ecrit le JSON, build l'app, puis GitHub Pages sert uniquement des fichiers statiques.
