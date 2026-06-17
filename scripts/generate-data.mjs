import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fallbackSnapshot } from "../src/data/fallbackData.js";

const DATA_GOUV = "https://www.data.gouv.fr/api/1/datasets/";
const ODRE = "https://opendata.reseaux-energies.fr/api/explore/v2.1";
const outputPath = resolve("public/data/energy-intel.json");

function normalizeText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function groupCount(items, picker, limit = 10) {
  const counts = new Map();

  items.forEach((item) => {
    const raw = picker(item);
    const values = Array.isArray(raw) ? raw : [raw];
    values
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter(Boolean)
      .forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

async function fetchJson(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mission-Control-Energie-GitHub-Pages/1.0"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return { data: await response.json(), latency: Date.now() - started };
  } finally {
    clearTimeout(timeout);
  }
}

async function timedSource(name, task) {
  const started = Date.now();

  try {
    const result = await task();
    return {
      ok: true,
      value: result,
      health: {
        name,
        status: "cached-live",
        latency: result.latency || Date.now() - started
      }
    };
  } catch (error) {
    return {
      ok: false,
      value: null,
      health: {
        name,
        status: "fallback",
        latency: Date.now() - started,
        error: error.message
      }
    };
  }
}

function normalizeDataGouvDataset(dataset, query) {
  const resources = dataset.resources || [];
  const formats = [...new Set(resources.map((resource) => resource.format).filter(Boolean))];

  return {
    id: dataset.id,
    title: normalizeText(dataset.title),
    description: normalizeText(dataset.description).slice(0, 240),
    organization: dataset.organization?.name || dataset.owner?.first_name || "Non renseigne",
    page: dataset.page,
    uri: dataset.uri,
    query,
    tags: dataset.tags || [],
    frequency: dataset.frequency || "unknown",
    license: dataset.license || "open",
    quality: Math.round((dataset.quality?.score || 0) * 100),
    resources: resources.length,
    formats,
    lastUpdate: dataset.last_update || dataset.last_modified,
    temporalCoverage: dataset.temporal_coverage,
    metrics: dataset.metrics || {}
  };
}

function normalizeOdreDataset(dataset) {
  const metas = dataset.metas?.default || {};
  const custom = dataset.custom || {};

  return {
    id: dataset.dataset_id,
    uid: dataset.dataset_uid,
    title: normalizeText(metas.title_fr || metas.title || dataset.dataset_id),
    description: normalizeText(metas.description_fr || metas.description).slice(0, 260),
    publisher: metas.publisher_fr || metas.publisher || "ODRE",
    territory: metas.territory || [],
    themes: metas.theme_fr || metas.theme || [],
    keywords: metas.keyword_fr || metas.keyword || [],
    energies: custom.energie || [],
    networks: custom.reseaux || [],
    temporalStep: custom["pas-temporel"] || null,
    geography: custom["maille-geographique"] || null,
    updateFrequency: custom["frequence-de-mise-a-jour"] || metas.accrualPeriodicity,
    records: metas.records_count || 0,
    modified: metas.modified || metas.data_processed,
    fields: (dataset.fields || []).map((field) => ({
      name: field.name,
      label: field.label_fr || field.label,
      type: field.type
    }))
  };
}

async function getDataGouvCatalog() {
  const queries = [
    "energie",
    "electricite",
    "gaz",
    "renouvelable",
    "climat",
    "emissions carbone",
    "qualite air",
    "sobriete energetique"
  ];

  const results = await Promise.all(
    queries.map((query) =>
      fetchJson(`${DATA_GOUV}?q=${encodeURIComponent(query)}&page_size=12`).then((result) => ({
        ...result,
        query
      }))
    )
  );

  const seen = new Set();
  const datasets = [];
  let total = 0;
  let latency = 0;

  results.forEach((result) => {
    latency += result.latency || 0;
    total += result.data.total || 0;
    (result.data.data || []).forEach((dataset) => {
      if (!dataset?.id || seen.has(dataset.id)) return;
      seen.add(dataset.id);
      datasets.push(normalizeDataGouvDataset(dataset, result.query));
    });
  });

  return {
    data: {
      total,
      datasets: datasets.sort((a, b) => (b.quality || 0) - (a.quality || 0)).slice(0, 64)
    },
    latency: Math.round(latency / Math.max(results.length, 1))
  };
}

async function getOdreCatalog() {
  const result = await fetchJson(`${ODRE}/catalog/datasets?limit=100`);
  const datasets = (result.data.results || []).map(normalizeOdreDataset);

  return {
    data: {
      total: result.data.total_count || datasets.length,
      datasets,
      themes: groupCount(datasets, (dataset) => dataset.themes),
      energies: groupCount(datasets, (dataset) => dataset.energies),
      publishers: groupCount(datasets, (dataset) => dataset.publisher)
    },
    latency: result.latency
  };
}

async function getOdreRecords(datasetId, limit = 90) {
  const result = await fetchJson(`${ODRE}/catalog/datasets/${datasetId}/records?limit=${limit}`);

  return {
    data: (result.data.results || []).map((record) => ({
      ...record,
      _dataset: datasetId
    })),
    latency: result.latency
  };
}

async function buildSnapshot() {
  const [dataGouv, odre, methane, gasScenarios] = await Promise.all([
    timedSource("data.gouv.fr", getDataGouvCatalog),
    timedSource("ODRE catalog", getOdreCatalog),
    timedSource("ODRE methane records", () =>
      getOdreRecords("evolution-emissions-directes-de-methane", 40)
    ),
    timedSource("ODRE gas scenarios", () => getOdreRecords("pg2024-conso-nat-secteur", 90))
  ]);

  return {
    status: dataGouv.ok || odre.ok ? "static-cache" : "fallback",
    generatedAt: new Date().toISOString(),
    staticGenerated: true,
    apiHealth: [dataGouv.health, odre.health, methane.health, gasScenarios.health],
    dataGouv: dataGouv.ok ? dataGouv.value.data : fallbackSnapshot.dataGouv,
    odre: odre.ok ? odre.value.data : fallbackSnapshot.odre,
    liveRecords: {
      methane: methane.ok ? methane.value.data : fallbackSnapshot.liveRecords.methane,
      gasScenarios: gasScenarios.ok
        ? gasScenarios.value.data
        : fallbackSnapshot.liveRecords.gasScenarios
    }
  };
}

const snapshot = await buildSnapshot();
await mkdir(resolve("public/data"), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

console.log(
  `Generated ${outputPath} with ${snapshot.dataGouv.datasets.length} data.gouv.fr datasets and ${snapshot.odre.datasets.length} ODRE datasets.`
);
