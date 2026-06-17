# Mission Control Energie

Dashboard hackathon spectaculaire et robuste pour explorer les donnees energie/ecologie en France, avec un angle monde en bonus.

## Stack

- React + Vite pour l'interface multi-pages.
- Petit backend Node natif dans `server/index.mjs`.
- APIs publiques :
  - data.gouv.fr : catalogue de datasets energie, climat, emissions, gaz, electricite, renouvelables.
  - ODRE / Open Data Reseaux Energies : catalogue, donnees methane, scenarios gaz.
- Fallback local embarque : si le reseau tombe, les graphes et interactions restent utilisables.

## Lancer

```bash
npm install
npm run build
npm start
```

URL locale :

```text
http://127.0.0.1:4173
```

## Pages

- Cockpit : KPIs, etat API, carte rapide, briefing.
- Mix energie : repartition, themes ODRE, scenarios gaz.
- Production : tendances production et consommation.
- Carbone : emissions sectorielles, methane, matrice impact/complexite.
- Carte France : signaux regionaux interactifs.
- Monde : comparaison France / monde.
- Simulateur : sliders pour tester un scenario 2030.
- Data explorer : recherche live data.gouv.fr.
- Sources : constellation des familles de donnees et strategie anti-bug.

## Endpoints locaux

```text
GET /api/health
GET /api/energy-intel
GET /api/search?q=energie
```

`/api/energy-intel` met en cache les resultats 5 minutes pour eviter de surcharger les APIs publiques pendant une demo.
