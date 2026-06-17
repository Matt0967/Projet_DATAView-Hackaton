import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "..");
const distDir = join(rootDir, "dist");
const publicDir = existsSync(distDir) ? distDir : rootDir;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=300"
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

const DATA_GOUV = "https://www.data.gouv.fr/api/1/datasets/";
const ODRE = "https://opendata.reseaux-energies.fr/api/explore/v2.1";
const cache = new Map();

const fallbackSnapshot = {
  status: "fallback",
  generatedAt: new Date().toISOString(),
  apiHealth: [
    { name: "data.gouv.fr", status: "fallback", latency: 0 },
    { name: "ODRE", status: "fallback", latency: 0 }
  ],
  dataGouv: {
    total: 0,
    datasets: []
  },
  odre: {
    total: 0,
    datasets: [],
    themes: [],
    energies: [],
    publishers: []
  },
  liveRecords: {
    methane: [],
    gasScenarios: []
  },
  message:
    "Les APIs publiques ne sont pas joignables depuis cet environnement. L'interface continue avec son jeu de donnees embarque."
};

function sendJson(res, body, statusCode = 200) {
  res.writeHead(statusCode, jsonHeaders);
  res.end(JSON.stringify(body));
}

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

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mission-Control-Energie/1.0"
      },
      signal: controller.signal
    });
    const latency = Math.round(performance.now() - started);

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return { data: await response.json(), latency };
  } finally {
    clearTimeout(timeout);
  }
}

async function timedSource(name, task) {
  const started = performance.now();

  try {
    const result = await task();
    return {
      ok: true,
      value: result,
      health: {
        name,
        status: "live",
        latency: result.latency || Math.round(performance.now() - started)
      }
    };
  } catch (error) {
    return {
      ok: false,
      value: null,
      health: {
        name,
        status: "fallback",
        latency: Math.round(performance.now() - started),
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
  const calls = queries.map((query) =>
    fetchJson(`${DATA_GOUV}?q=${encodeURIComponent(query)}&page_size=12`).then((result) => ({
      ...result,
      query
    }))
  );
  const results = await Promise.all(calls);
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
  const result = await fetchJson(`${ODRE}/catalog/datasets?limit=100`, 9000);
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

async function getOdreRecords(datasetId, limit = 80) {
  const result = await fetchJson(
    `${ODRE}/catalog/datasets/${datasetId}/records?limit=${limit}`,
    8000
  );

  return {
    data: (result.data.results || []).map((record) => ({
      ...record,
      _dataset: datasetId
    })),
    latency: result.latency
  };
}

async function buildSnapshot() {
  const cacheKey = "energy-intel";
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < 5 * 60 * 1000) {
    return { ...cached.value, cache: "hit" };
  }

  const [dataGouv, odre, methane, gasScenarios] = await Promise.all([
    timedSource("data.gouv.fr", getDataGouvCatalog),
    timedSource("ODRE catalog", getOdreCatalog),
    timedSource("ODRE methane records", () =>
      getOdreRecords("evolution-emissions-directes-de-methane", 40)
    ),
    timedSource("ODRE gas scenarios", () => getOdreRecords("pg2024-conso-nat-secteur", 90))
  ]);

  const snapshot = {
    status: dataGouv.ok || odre.ok ? "live" : "fallback",
    generatedAt: new Date().toISOString(),
    cache: "miss",
    apiHealth: [dataGouv.health, odre.health, methane.health, gasScenarios.health],
    dataGouv: dataGouv.ok ? dataGouv.value.data : fallbackSnapshot.dataGouv,
    odre: odre.ok ? odre.value.data : fallbackSnapshot.odre,
    liveRecords: {
      methane: methane.ok ? methane.value.data : [],
      gasScenarios: gasScenarios.ok ? gasScenarios.value.data : []
    }
  };

  cache.set(cacheKey, { timestamp: now, value: snapshot });
  return snapshot;
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const rawPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const safePath = rawPath.replace(/\.\./g, "");
  const filePath = join(publicDir, safePath);
  const fallbackPath = join(publicDir, "index.html");
  const target = existsSync(filePath) ? filePath : fallbackPath;
  const ext = extname(target);

  try {
    await readFile(target);
    res.writeHead(200, {
      "content-type": mimeTypes[ext] || "application/octet-stream"
    });
    createReadStream(target).pipe(res);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/health") {
    sendJson(res, {
      ok: true,
      service: "Mission Control Energie API",
      generatedAt: new Date().toISOString()
    });
    return;
  }

  if (url.pathname === "/api/energy-intel") {
    try {
      sendJson(res, await buildSnapshot());
    } catch (error) {
      sendJson(
        res,
        {
          ...fallbackSnapshot,
          error: error.message,
          generatedAt: new Date().toISOString()
        },
        200
      );
    }
    return;
  }

  if (url.pathname === "/api/search") {
    const query = url.searchParams.get("q") || "energie";
    try {
      const result = await fetchJson(
        `${DATA_GOUV}?q=${encodeURIComponent(query)}&page_size=20`,
        8000
      );
      sendJson(res, {
        status: "live",
        query,
        total: result.data.total || 0,
        latency: result.latency,
        datasets: (result.data.data || []).map((dataset) => normalizeDataGouvDataset(dataset, query))
      });
    } catch (error) {
      sendJson(res, {
        status: "fallback",
        query,
        total: 0,
        error: error.message,
        datasets: []
      });
    }
    return;
  }

  await serveStatic(req, res);
});

server.listen(port, host, () => {
  console.log(`Mission Control Energie server listening on http://${host}:${port}`);
});
