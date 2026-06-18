export const fallbackSnapshot = {
  status: "fallback",
  generatedAt: new Date().toISOString(),
  apiHealth: [
    { name: "data.gouv.fr", status: "fallback", latency: 0 },
    { name: "ODRE catalog", status: "fallback", latency: 0 },
    { name: "ODRE methane records", status: "fallback", latency: 0 },
    { name: "ODRE gas scenarios", status: "fallback", latency: 0 }
  ],
  dataGouv: {
    total: 178,
    datasets: [
      {
        id: "fr-energy-paris",
        title: "Energies - Energie totale consommee a Paris",
        organization: "Ville de Paris",
        query: "energie",
        tags: ["electricite", "gaz", "biomasse", "plan-climat"],
        quality: 89,
        resources: 2,
        formats: ["csv", "json"],
        page: "https://www.data.gouv.fr/datasets/energies-energie-totale-consommee-a-paris"
      },
      {
        id: "fr-ges-energy",
        title: "Emissions de gaz a effet de serre liees aux consommations d'energie",
        organization: "Grand Poitiers Open Data",
        query: "emissions carbone",
        tags: ["climat", "consommation", "energie"],
        quality: 76,
        resources: 4,
        formats: ["csv", "api"],
        page: "https://www.data.gouv.fr"
      },
      {
        id: "fr-renewable-production",
        title: "Productions d'energies renouvelables territoriales",
        organization: "ADEME / collectivites",
        query: "renouvelable",
        tags: ["solaire", "eolien", "biomasse", "hydraulique"],
        quality: 82,
        resources: 5,
        formats: ["csv", "xlsx"],
        page: "https://www.data.gouv.fr"
      }
    ]
  },
  odre: {
    total: 188,
    themes: [
      { name: "Consommation", count: 34 },
      { name: "Production", count: 31 },
      { name: "Environnement", count: 26 },
      { name: "Infrastructures", count: 24 },
      { name: "Marches", count: 19 },
      { name: "Mobilite", count: 14 }
    ],
    energies: [
      { name: "Electricite", count: 62 },
      { name: "Gaz", count: 58 },
      { name: "Multi-energies", count: 31 },
      { name: "Renouvelables", count: 25 },
      { name: "Hydrogene", count: 6 }
    ],
    publishers: [
      { name: "RTE", count: 61 },
      { name: "GRDF", count: 42 },
      { name: "NaTran", count: 24 },
      { name: "Teréga", count: 18 },
      { name: "Enedis", count: 16 },
      { name: "GRTgaz", count: 11 }
    ],
    datasets: [
      {
        id: "evolution-emissions-directes-de-methane",
        title: "Evolution des emissions directes de methane depuis 2016",
        publisher: "NaTran, Teréga",
        energies: ["Gaz"],
        themes: ["Environnement"],
        records: 19,
        geography: "National",
        temporalStep: "Annuel"
      },
      {
        id: "pg2024-conso-nat-secteur",
        title: "Scenarios de consommation a horizon 2030 et 2035",
        publisher: "GRDF, NaTran, Teréga",
        energies: ["Gaz"],
        themes: ["Consommation"],
        records: 66,
        geography: "National",
        temporalStep: "Annuel"
      },
      {
        id: "registre-national-installation-production-stockage-electricite",
        title: "Registre national des installations de production et stockage d'electricite",
        publisher: "RTE",
        energies: ["Electricite", "Renouvelables"],
        themes: ["Production"],
        records: 112000,
        geography: "Commune",
        temporalStep: "Mensuel"
      }
    ]
  },
  liveRecords: {
    methane: [],
    gasScenarios: []
  }
};

export const commandKpis = [
  {
    label: "Jeux de donnees energie/ecologie",
    value: "360+",
    delta: "+ sources live",
    tone: "cyan",
    detail: "ODRE + data.gouv.fr"
  },
  {
    label: "Part bas-carbone electricite France",
    value: "91%",
    delta: "nucleaire + renouvelables",
    tone: "green",
    detail: "Indicateur cockpit"
  },
  {
    label: "Pression carbone energie",
    value: "41",
    unit: "MtCO2e",
    delta: "- trajectoire long terme",
    tone: "amber",
    detail: "Energie et combustion"
  },
  {
    label: "Signal sobriete 2030",
    value: "-25%",
    delta: "objectif scenario",
    tone: "violet",
    detail: "Consommation finale"
  }
];

export const energyMix = [
  { name: "Nucleaire", value: 64, color: "#8b5cf6", co2: 6, trend: "+8.4" },
  { name: "Hydraulique", value: 12, color: "#38bdf8", co2: 5, trend: "+1.8" },
  { name: "Eolien", value: 9, color: "#2dd4bf", co2: 12, trend: "+2.2" },
  { name: "Solaire", value: 6, color: "#facc15", co2: 35, trend: "+3.9" },
  { name: "Gaz", value: 6, color: "#fb7185", co2: 418, trend: "-2.7" },
  { name: "Bioenergie", value: 2, color: "#84cc16", co2: 48, trend: "+0.6" },
  { name: "Charbon/Fioul", value: 1, color: "#f97316", co2: 820, trend: "-0.4" }
];

export const productionTrend = [
  { year: 2017, nucleaire: 379, renouvelables: 96, gaz: 54, fossiles: 12 },
  { year: 2018, nucleaire: 394, renouvelables: 105, gaz: 50, fossiles: 10 },
  { year: 2019, nucleaire: 380, renouvelables: 113, gaz: 39, fossiles: 8 },
  { year: 2020, nucleaire: 335, renouvelables: 120, gaz: 38, fossiles: 7 },
  { year: 2021, nucleaire: 361, renouvelables: 125, gaz: 41, fossiles: 8 },
  { year: 2022, nucleaire: 279, renouvelables: 132, gaz: 49, fossiles: 9 },
  { year: 2023, nucleaire: 320, renouvelables: 141, gaz: 32, fossiles: 6 },
  { year: 2024, nucleaire: 361, renouvelables: 149, gaz: 25, fossiles: 5 },
  { year: 2025, nucleaire: 367, renouvelables: 158, gaz: 23, fossiles: 4 },
  { year: 2026, nucleaire: 374, renouvelables: 166, gaz: 21, fossiles: 3 }
];

export const consumptionTrend = [
  { year: 2017, residentiel: 173, tertiaire: 139, industrie: 113, transport: 505, agriculture: 46 },
  { year: 2018, residentiel: 168, tertiaire: 136, industrie: 111, transport: 501, agriculture: 45 },
  { year: 2019, residentiel: 164, tertiaire: 132, industrie: 109, transport: 496, agriculture: 44 },
  { year: 2020, residentiel: 160, tertiaire: 118, industrie: 97, transport: 412, agriculture: 43 },
  { year: 2021, residentiel: 166, tertiaire: 126, industrie: 105, transport: 455, agriculture: 44 },
  { year: 2022, residentiel: 158, tertiaire: 119, industrie: 100, transport: 452, agriculture: 42 },
  { year: 2023, residentiel: 151, tertiaire: 115, industrie: 96, transport: 444, agriculture: 41 },
  { year: 2024, residentiel: 147, tertiaire: 111, industrie: 94, transport: 436, agriculture: 40 },
  { year: 2025, residentiel: 143, tertiaire: 108, industrie: 92, transport: 429, agriculture: 39 },
  { year: 2026, residentiel: 139, tertiaire: 105, industrie: 90, transport: 421, agriculture: 38 }
];

export const emissionsTrend = [
  { year: 2017, energie: 48, transport: 136, industrie: 78, batiments: 76, agriculture: 81 },
  { year: 2018, energie: 45, transport: 135, industrie: 75, batiments: 72, agriculture: 80 },
  { year: 2019, energie: 42, transport: 134, industrie: 73, batiments: 69, agriculture: 79 },
  { year: 2020, energie: 38, transport: 114, industrie: 65, batiments: 66, agriculture: 78 },
  { year: 2021, energie: 41, transport: 122, industrie: 68, batiments: 68, agriculture: 78 },
  { year: 2022, energie: 43, transport: 124, industrie: 66, batiments: 63, agriculture: 77 },
  { year: 2023, energie: 38, transport: 121, industrie: 62, batiments: 59, agriculture: 76 },
  { year: 2024, energie: 35, transport: 118, industrie: 59, batiments: 56, agriculture: 75 },
  { year: 2025, energie: 33, transport: 115, industrie: 57, batiments: 53, agriculture: 74 },
  { year: 2026, energie: 31, transport: 111, industrie: 54, batiments: 50, agriculture: 73 }
];

export const regionalSignals = [
  {
    id: "idf",
    region: "Ile-de-France",
    x: 315,
    y: 160,
    intensity: 69,
    renewable: 13,
    consumption: 214,
    co2: 24,
    focus: "Sobriete batiments + mobilite"
  },
  {
    id: "hdf",
    region: "Hauts-de-France",
    x: 306,
    y: 78,
    intensity: 74,
    renewable: 19,
    consumption: 178,
    co2: 28,
    focus: "Industrie, hydrogene, eolien"
  },
  {
    id: "normandie",
    region: "Normandie",
    x: 221,
    y: 143,
    intensity: 59,
    renewable: 21,
    consumption: 112,
    co2: 14,
    focus: "Nucleaire + offshore"
  },
  {
    id: "bretagne",
    region: "Bretagne",
    x: 118,
    y: 205,
    intensity: 45,
    renewable: 27,
    consumption: 86,
    co2: 9,
    focus: "Eolien, reseau, biomethane"
  },
  {
    id: "pdl",
    region: "Pays de la Loire",
    x: 210,
    y: 254,
    intensity: 55,
    renewable: 25,
    consumption: 98,
    co2: 12,
    focus: "Solaire + chaleur"
  },
  {
    id: "cvdl",
    region: "Centre-Val de Loire",
    x: 310,
    y: 245,
    intensity: 48,
    renewable: 18,
    consumption: 82,
    co2: 9,
    focus: "Nucleaire + sobriete"
  },
  {
    id: "grandest",
    region: "Grand Est",
    x: 423,
    y: 168,
    intensity: 67,
    renewable: 24,
    consumption: 154,
    co2: 20,
    focus: "Biomasse + industrie"
  },
  {
    id: "bfc",
    region: "Bourgogne-Franche-Comte",
    x: 412,
    y: 286,
    intensity: 52,
    renewable: 30,
    consumption: 77,
    co2: 8,
    focus: "Bois energie + hydraulique"
  },
  {
    id: "na",
    region: "Nouvelle-Aquitaine",
    x: 251,
    y: 393,
    intensity: 61,
    renewable: 32,
    consumption: 151,
    co2: 17,
    focus: "Solaire + biomasse"
  },
  {
    id: "ara",
    region: "Auvergne-Rhone-Alpes",
    x: 430,
    y: 408,
    intensity: 58,
    renewable: 38,
    consumption: 172,
    co2: 19,
    focus: "Hydraulique + industrie"
  },
  {
    id: "occ",
    region: "Occitanie",
    x: 321,
    y: 514,
    intensity: 57,
    renewable: 41,
    consumption: 133,
    co2: 13,
    focus: "Solaire, eolien, reseau"
  },
  {
    id: "paca",
    region: "Provence-Alpes-Cote d'Azur",
    x: 489,
    y: 520,
    intensity: 64,
    renewable: 26,
    consumption: 121,
    co2: 16,
    focus: "Solaire + chaleur urbaine"
  },
  {
    id: "corse",
    region: "Corse",
    x: 555,
    y: 610,
    intensity: 73,
    renewable: 31,
    consumption: 13,
    co2: 2,
    focus: "Autonomie + stockage"
  }
];

export const globalSignals = [
  {
    label: "Monde",
    fossil: 80,
    lowCarbon: 20,
    demand: 100,
    risk: 74,
    lat: 18,
    lon: 20,
    color: "#f97316",
    momentum: "+2.1%",
    note: "Point de repere global pour comparer les trajectoires nationales."
  },
  {
    label: "Union europeenne",
    fossil: 69,
    lowCarbon: 31,
    demand: 88,
    risk: 56,
    lat: 50,
    lon: 9,
    color: "#38bdf8",
    momentum: "+4.8%",
    note: "Forte acceleration reglementaire, interconnexions et electrification."
  },
  {
    label: "France",
    fossil: 46,
    lowCarbon: 54,
    demand: 71,
    risk: 37,
    lat: 46,
    lon: 2,
    color: "#2dd4bf",
    momentum: "+3.9%",
    note: "Mix electrique tres bas-carbone, tension sur chaleur, transport et flexibilite."
  },
  {
    label: "Amerique du Nord",
    fossil: 78,
    lowCarbon: 22,
    demand: 112,
    risk: 69,
    lat: 47,
    lon: -101,
    color: "#a78bfa",
    momentum: "+2.7%",
    note: "Demande elevee, electrification rapide, reseaux et stockage critiques."
  },
  {
    label: "Asie-Pacifique",
    fossil: 84,
    lowCarbon: 16,
    demand: 142,
    risk: 82,
    lat: 28,
    lon: 105,
    color: "#fb7185",
    momentum: "+5.6%",
    note: "Croissance de demande massive, solaire et stockage a tres grande echelle."
  },
  {
    label: "Afrique",
    fossil: 71,
    lowCarbon: 29,
    demand: 46,
    risk: 66,
    lat: 4,
    lon: 20,
    color: "#facc15",
    momentum: "+6.3%",
    note: "Acces energie, solaire, reseaux resilients et financement sont decisifs."
  }
];

export const sourceFamilies = [
  { label: "Electricite", value: 62, color: "#38bdf8" },
  { label: "Gaz", value: 58, color: "#fb7185" },
  { label: "Climat", value: 44, color: "#a78bfa" },
  { label: "Renouvelables", value: 38, color: "#2dd4bf" },
  { label: "Territoires", value: 33, color: "#facc15" },
  { label: "Air", value: 21, color: "#84cc16" },
  { label: "Mobilite", value: 18, color: "#f97316" },
  { label: "Stockage", value: 12, color: "#60a5fa" }
];

export const timelineMoments = [
  {
    year: "2015",
    title: "Accord de Paris",
    signal: "Point de depart politique global",
    score: 42
  },
  {
    year: "2020",
    title: "Choc de demande",
    signal: "Baisse temporaire des consommations et emissions",
    score: 51
  },
  {
    year: "2022",
    title: "Crise energie",
    signal: "Prix, securite d'approvisionnement, sobriete",
    score: 63
  },
  {
    year: "2024",
    title: "Rebond bas-carbone",
    signal: "Production nucleaire et renouvelable plus forte",
    score: 72
  },
  {
    year: "2030",
    title: "Mur de transformation",
    signal: "Electrification, flexibilite, baisse des fossiles",
    score: 88
  }
];

export const insightCards = [
  {
    title: "La vraie bataille est la flexibilite",
    body:
      "Plus le mix devient bas-carbone, plus les pointes, le stockage, l'effacement et les interconnexions deviennent critiques."
  },
  {
    title: "Le gaz reste un sujet de transition",
    body:
      "La baisse de consommation doit avancer avec biomethane, chaleur, industrie et securite d'approvisionnement."
  },
  {
    title: "Les territoires ne jouent pas la meme partie",
    body:
      "Une carte nationale cache des profils tres differents : industrie, densite urbaine, solaire, hydraulique, reseaux."
  },
  {
    title: "Les donnees sont deja un avantage",
    body:
      "ODRE et data.gouv.fr donnent assez de matiere pour detecter des signaux, prioriser et raconter la transition."
  }
];
