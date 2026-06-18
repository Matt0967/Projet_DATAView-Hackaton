import {
  Activity,
  BarChart3,
  BatteryCharging,
  Bolt,
  BrainCircuit,
  ChevronRight,
  CircleGauge,
  Database,
  Download,
  Factory,
  Flame,
  Gauge,
  Globe2,
  Layers3,
  Leaf,
  Map as MapIcon,
  Network,
  Orbit,
  PlugZap,
  RadioTower,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Target,
  Waves,
  Zap
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  commandKpis,
  consumptionTrend,
  emissionsTrend,
  energyMix,
  fallbackSnapshot,
  globalSignals,
  insightCards,
  productionTrend,
  regionalSignals,
  sourceFamilies,
  timelineMoments
} from "./data/fallbackData.js";
import { franceMapViewBox, franceRegionPaths } from "./data/franceMapPaths.js";

const pageConfig = [
  { id: "cockpit", label: "Cockpit", icon: Gauge },
  { id: "mix", label: "Mix energie", icon: Bolt },
  { id: "flux", label: "Production", icon: Waves },
  { id: "carbone", label: "Carbone", icon: Leaf },
  { id: "territoires", label: "Carte France", icon: MapIcon },
  { id: "monde", label: "Monde", icon: Globe2 },
  { id: "simulateur", label: "Simulateur", icon: Settings2 },
  { id: "data", label: "Data explorer", icon: Database },
  { id: "sources", label: "Sources", icon: Network }
];

const lineColors = {
  nucleaire: "#a78bfa",
  renouvelables: "#2dd4bf",
  gaz: "#fb7185",
  fossiles: "#f97316",
  residentiel: "#38bdf8",
  tertiaire: "#8b5cf6",
  industrie: "#f59e0b",
  transport: "#fb7185",
  agriculture: "#84cc16",
  energie: "#38bdf8",
  batiments: "#a78bfa"
};

const worldLandShapes = [
  {
    name: "North America",
    points: [
      [72, -166],
      [68, -136],
      [57, -124],
      [52, -97],
      [48, -76],
      [36, -74],
      [24, -98],
      [16, -89],
      [9, -82],
      [16, -105],
      [26, -116],
      [42, -124],
      [54, -143],
      [60, -160]
    ]
  },
  {
    name: "South America",
    points: [
      [12, -79],
      [7, -57],
      [-8, -42],
      [-24, -45],
      [-38, -58],
      [-54, -70],
      [-36, -73],
      [-16, -76],
      [0, -81]
    ]
  },
  {
    name: "Europe",
    points: [
      [70, -10],
      [63, 30],
      [52, 44],
      [40, 32],
      [35, 10],
      [43, -9],
      [54, -6]
    ]
  },
  {
    name: "Africa",
    points: [
      [35, -17],
      [31, 34],
      [11, 51],
      [-10, 42],
      [-35, 20],
      [-30, 5],
      [-18, -14],
      [5, -17],
      [20, -10]
    ]
  },
  {
    name: "Asia",
    points: [
      [72, 34],
      [69, 92],
      [58, 140],
      [43, 151],
      [22, 122],
      [8, 103],
      [19, 78],
      [8, 45],
      [30, 34],
      [50, 47]
    ]
  },
  {
    name: "Australia",
    points: [
      [-12, 113],
      [-10, 143],
      [-25, 154],
      [-38, 137],
      [-32, 116]
    ]
  },
  {
    name: "Greenland",
    points: [
      [82, -52],
      [75, -22],
      [62, -43],
      [61, -62],
      [72, -72]
    ]
  }
];

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value || 0));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function worldMetric(signal, mode) {
  if (mode === "Bas-carbone") return signal.lowCarbon;
  if (mode === "Demande") return Math.round(signal.demand);
  return signal.risk;
}

function worldMetricLabel(mode) {
  if (mode === "Bas-carbone") return "bas-carbone";
  if (mode === "Demande") return "demande";
  return "risque";
}

function buildScopeDiagnostics(snapshot, scope, catalog) {
  const sourceHealth = snapshot.apiHealth || [];
  const liveSources = sourceHealth.filter((source) => source.status !== "fallback").length;
  const generatedAt = snapshot.generatedAt ? new Date(snapshot.generatedAt) : null;
  const cacheMinutes = generatedAt ? Math.max(0, Math.round((Date.now() - generatedAt.getTime()) / 60000)) : null;
  const odreCount = catalog.filter((dataset) => dataset.source === "ODRE").length;
  const dataGouvCount = catalog.filter((dataset) => dataset.source === "data.gouv.fr").length;

  return {
    scope,
    liveSources,
    cacheMinutes,
    generatedAt,
    catalogCount: catalog.length,
    odreCount,
    dataGouvCount,
    label: `${scope}: ${liveSources}/4 caches OK`,
    detail:
      scope === "Monde"
        ? "Monde = contexte global + cache public France/ODRE pour comparaison."
        : "France = cache public ODRE + data.gouv.fr pour les graphes et datasets."
  };
}

function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function useEnergyIntel() {
  const [snapshot, setSnapshot] = useState(fallbackSnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetch(`${import.meta.env.BASE_URL}data/energy-intel.json`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Data cache ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setSnapshot(data);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setSnapshot(fallbackSnapshot);
          setError(fetchError.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshIndex]);

  return { snapshot, loading, error, refresh: () => setRefreshIndex((value) => value + 1) };
}

function buildCatalog(snapshot) {
  const dataGouv = (snapshot.dataGouv?.datasets || []).map((dataset) => ({
    id: dataset.id,
    title: dataset.title,
    source: "data.gouv.fr",
    publisher: dataset.organization,
    theme: dataset.query || "open data",
    energy: (dataset.tags || []).slice(0, 3).join(", ") || "multi",
    quality: dataset.quality || 0,
    records: dataset.resources || 0,
    page: dataset.page,
    formats: dataset.formats || []
  }));

  const odre = (snapshot.odre?.datasets || []).map((dataset) => ({
    id: dataset.id,
    title: dataset.title,
    source: "ODRE",
    publisher: dataset.publisher,
    theme: (dataset.themes || []).join(", ") || dataset.geography || "energie",
    energy: (dataset.energies || []).join(", ") || "multi",
    quality: dataset.records ? clamp(dataset.records / 1500, 12, 96) : 62,
    records: dataset.records || 0,
    page: `https://opendata.reseaux-energies.fr/explore/dataset/${dataset.id}/`,
    formats: ["api", "csv", "json"]
  }));

  return [...odre, ...dataGouv].slice(0, 80);
}

function extractMethaneSeries(records) {
  if (!records?.length) {
    return [
      { year: 2016, methane: 18800 },
      { year: 2017, methane: 17100 },
      { year: 2018, methane: 15200 },
      { year: 2019, methane: 13600 },
      { year: 2020, methane: 12400 },
      { year: 2021, methane: 10900 },
      { year: 2022, methane: 9600 },
      { year: 2023, methane: 8500 },
      { year: 2024, methane: 7800 }
    ];
  }

  const byYear = new Map();

  records.forEach((record) => {
    const year = Number(String(record.annee || "").slice(0, 4));
    const value =
      Number(record.emission_de_methane_tonnes_ch4) ||
      Number(record.emission_de_methane_mm3) * 660 ||
      0;
    if (!year || !value) return;
    byYear.set(year, (byYear.get(year) || 0) + value);
  });

  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, methane]) => ({ year, methane }));
}

function extractGasScenarios(records) {
  if (!records?.length) {
    return [
      { label: "2024", basse: 334, fit55: 329, haute: 343 },
      { label: "2030", basse: 289, fit55: 300, haute: 317 },
      { label: "2035", basse: 264, fit55: 282, haute: 303 }
    ];
  }

  const byYear = new Map();
  records.forEach((record) => {
    const year = String(record.annee || "").slice(0, 4);
    if (!year) return;
    const current = byYear.get(year) || { label: year, basse: 0, fit55: 0, haute: 0, count: 0 };
    current.basse += Number(record.pg24_sensibilite_basse) || 0;
    current.fit55 += Number(record.pg24_fit_for_55) || 0;
    current.haute += Number(record.pg24_sensibilite_haute) || 0;
    current.count += 1;
    byYear.set(year, current);
  });

  return [...byYear.values()]
    .sort((a, b) => Number(a.label) - Number(b.label))
    .map((item) => ({
      label: item.label,
      basse: Math.round(item.basse / Math.max(item.count, 1)),
      fit55: Math.round(item.fit55 / Math.max(item.count, 1)),
      haute: Math.round(item.haute / Math.max(item.count, 1))
    }));
}

function App() {
  const { snapshot, loading, error, refresh } = useEnergyIntel();
  const [activePage, setActivePage] = useState("cockpit");
  const [scope, setScope] = useState("France");
  const [pulseMode, setPulseMode] = useState("Mission");
  const [selectedRegion, setSelectedRegion] = useState(regionalSignals[0]);

  const catalog = useMemo(() => buildCatalog(snapshot), [snapshot]);
  const methaneSeries = useMemo(
    () => extractMethaneSeries(snapshot.liveRecords?.methane),
    [snapshot]
  );
  const gasScenarios = useMemo(
    () => extractGasScenarios(snapshot.liveRecords?.gasScenarios),
    [snapshot]
  );
  const scopeDiagnostics = useMemo(
    () => buildScopeDiagnostics(snapshot, scope, catalog),
    [catalog, scope, snapshot]
  );

  const apiLiveCount = (snapshot.apiHealth || []).filter((source) => source.status !== "fallback").length;
  const totalDatasets =
    (snapshot.dataGouv?.total || fallbackSnapshot.dataGouv.total) +
    (snapshot.odre?.total || fallbackSnapshot.odre.total);

  function handlePageChange(pageId) {
    setActivePage(pageId);
    if (pageId === "monde") {
      setScope("Monde");
    } else if (["cockpit", "mix", "flux", "carbone", "territoires"].includes(pageId)) {
      setScope("France");
    }
  }

  function handleScopeChange(nextScope) {
    setScope(nextScope);
    if (nextScope === "Monde") {
      setActivePage("monde");
    } else if (activePage === "monde") {
      setActivePage("cockpit");
    }
  }

  const context = {
    snapshot,
    loading,
    error,
    refresh,
    activePage,
    setActivePage: handlePageChange,
    scope,
    setScope: handleScopeChange,
    pulseMode,
    setPulseMode,
    selectedRegion,
    setSelectedRegion,
    catalog,
    methaneSeries,
    gasScenarios,
    apiLiveCount,
    scopeDiagnostics,
    totalDatasets
  };

  return (
    <div className="app-shell">
      <AmbientGrid />
      <Sidebar activePage={activePage} setActivePage={handlePageChange} />
      <main className="mission-main">
        <TopBar {...context} />
        {activePage === "cockpit" && <CockpitPage {...context} />}
        {activePage === "mix" && <MixPage {...context} />}
        {activePage === "flux" && <FluxPage {...context} />}
        {activePage === "carbone" && <CarbonPage {...context} />}
        {activePage === "territoires" && <TerritoriesPage {...context} />}
        {activePage === "monde" && <WorldPage {...context} />}
        {activePage === "simulateur" && <SimulatorPage {...context} />}
        {activePage === "data" && <DataExplorerPage {...context} />}
        {activePage === "sources" && <SourcesPage {...context} />}
      </main>
    </div>
  );
}

function AmbientGrid() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="scan-line" />
      <div className="grid-plane" />
    </div>
  );
}

function Sidebar({ activePage, setActivePage }) {
  return (
    <aside className="sidebar">
      <button className="brand-button" onClick={() => setActivePage("cockpit")} title="Retour cockpit">
        <span className="brand-mark">
          <Zap size={22} />
        </span>
        <span>
          <strong>Mission Control</strong>
          <small>Energie</small>
        </span>
      </button>

      <nav className="nav-stack" aria-label="Navigation principale">
        {pageConfig.map((page) => {
          const Icon = page.icon;
          return (
            <button
              key={page.id}
              className={page.id === activePage ? "nav-item active" : "nav-item"}
              onClick={() => setActivePage(page.id)}
              title={page.label}
            >
              <Icon size={18} />
              <span>{page.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-card">
        <div className="sidebar-card__top">
          <ShieldCheck size={18} />
          <span>Demo-safe</span>
        </div>
        <p>Mode cache statique + fallback local pour garder une demo stable.</p>
      </div>
    </aside>
  );
}

function TopBar({
  loading,
  error,
  refresh,
  scope,
  setScope,
  pulseMode,
  setPulseMode,
  apiLiveCount,
  totalDatasets,
  snapshot,
  scopeDiagnostics
}) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">ODRE + data.gouv.fr</p>
        <h1>Mission Control Energie</h1>
      </div>

      <div className="topbar-actions">
        <SegmentedControl
          value={scope}
          onChange={setScope}
          items={["France", "Monde"]}
          label="Portee"
        />
        <SegmentedControl
          value={pulseMode}
          onChange={setPulseMode}
          items={["Mission", "Sobriete", "ENR", "Gaz"]}
          label="Mode"
        />
        <button className="icon-button" onClick={refresh} title="Relire le cache de donnees">
          <RefreshCw size={18} className={loading ? "spin" : ""} />
        </button>
      </div>

      <div className="status-strip">
        <StatusPill label={scopeDiagnostics.label} tone={scope === "Monde" ? "live" : "neutral"} />
        <StatusPill
          label={`${apiLiveCount}/4 sources cache`}
          tone={apiLiveCount ? "live" : "fallback"}
        />
        <StatusPill label={`${formatNumber(totalDatasets)} jeux detectes`} tone="neutral" />
        <StatusPill
          label={
            snapshot.generatedAt
              ? new Date(snapshot.generatedAt).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit"
                })
              : "cache local"
          }
          tone="neutral"
        />
        {error && <StatusPill label="fallback actif" tone="warning" />}
      </div>
    </header>
  );
}

function SegmentedControl({ value, onChange, items, label }) {
  return (
    <div className="segmented" aria-label={label}>
      {items.map((item) => (
        <button
          key={item}
          className={item === value ? "selected" : ""}
          onClick={() => onChange(item)}
          title={`${label}: ${item}`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function StatusPill({ label, tone = "neutral" }) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}

function SectionHeader({ icon: Icon = Sparkles, eyebrow, title, action }) {
  return (
    <div className="section-header">
      <div>
        <p className="eyebrow">
          <Icon size={14} />
          {eyebrow}
        </p>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function Panel({ className = "", children }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

function CockpitPage({
  snapshot,
  loading,
  totalDatasets,
  catalog,
  apiLiveCount,
  selectedRegion,
  setSelectedRegion,
  setActivePage
}) {
  const liveSources = snapshot.apiHealth || [];
  const kpis = commandKpis.map((kpi, index) => {
    if (index === 0) {
      return { ...kpi, value: `${formatNumber(totalDatasets)}`, delta: `${catalog.length} cartes pretes` };
    }
    if (index === 1 && apiLiveCount > 0) {
      return { ...kpi, delta: `${apiLiveCount} sources rafraichies` };
    }
    return kpi;
  });

  return (
    <div className="page-grid cockpit-grid">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">
            <Activity size={15} />
            Cockpit national
          </p>
          <h2>Lecture instantanee de la transition energie-climat.</h2>
          <p>
            Donnees publiques, graphes denses, carte territoriale et simulateur pour raconter
            vite ou analyser plus finement.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => setActivePage("simulateur")}>
              <BrainCircuit size={18} />
              Lancer un scenario
            </button>
            <button className="secondary-button" onClick={() => setActivePage("data")}>
              <Database size={18} />
              Explorer les datasets
            </button>
          </div>
        </div>
        <EnergyCore loading={loading} liveCount={apiLiveCount} />
      </section>

      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <MetricCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <Panel className="span-7">
        <SectionHeader icon={Bolt} eyebrow="Mix electrique" title="Repartition bas-carbone / fossile" />
        <div className="split-panel">
          <DonutChart data={energyMix} />
          <div className="mix-list">
            {energyMix.map((item) => (
              <div key={item.name} className="mix-row">
                <span className="dot" style={{ background: item.color }} />
                <span>{item.name}</span>
                <strong>{item.value}%</strong>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel className="span-5">
        <SectionHeader icon={MapIcon} eyebrow="Carte mission" title={selectedRegion.region} />
        <MiniFranceMap
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          compact
        />
        <div className="region-brief">
          <strong>{selectedRegion.focus}</strong>
          <span>{selectedRegion.consumption} TWh consommes</span>
          <span>{selectedRegion.renewable}% renouvelables</span>
        </div>
      </Panel>

      <Panel className="span-6">
        <SectionHeader icon={Activity} eyebrow="Cache data" title="Etat des sources publiques" />
        <div className="health-list">
          {liveSources.map((source) => (
            <div key={source.name} className="health-row">
              <span className={`health-led ${source.status}`} />
              <div>
                <strong>{source.name}</strong>
                <small>{source.error || `${source.latency || 0} ms`}</small>
              </div>
              <StatusPill
                label={source.status !== "fallback" ? "cache" : "fallback"}
                tone={source.status !== "fallback" ? "live" : "warning"}
              />
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="span-6">
        <SectionHeader icon={Sparkles} eyebrow="Insights" title="Briefing automatique" />
        <div className="insight-stack">
          {insightCards.map((card) => (
            <article key={card.title} className="insight-card">
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function MetricCard({ label, value, unit, delta, tone, detail }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>
        {value}
        {unit && <small>{unit}</small>}
      </strong>
      <p>{delta}</p>
      <em>{detail}</em>
    </article>
  );
}

function EnergyCore({ loading, liveCount }) {
  const rings = [0, 1, 2, 3, 4];
  return (
    <div className="energy-core" aria-label="Etat du cockpit energie">
      {rings.map((ring) => (
        <span key={ring} className={`core-ring ring-${ring}`} />
      ))}
      <div className="core-center">
        {loading ? <RefreshCw className="spin" size={28} /> : <PlugZap size={30} />}
        <strong>{liveCount ? "CACHE" : "SAFE"}</strong>
        <small>{liveCount}/4 sources</small>
      </div>
    </div>
  );
}

function MixPage({ snapshot, gasScenarios }) {
  const themes = snapshot.odre?.themes?.length ? snapshot.odre.themes : fallbackSnapshot.odre.themes;
  const energies = snapshot.odre?.energies?.length ? snapshot.odre.energies : fallbackSnapshot.odre.energies;

  return (
    <div className="page-grid">
      <Panel className="span-12">
        <SectionHeader icon={Bolt} eyebrow="Mix" title="Toutes energies, lecture croisee" />
        <div className="mix-dashboard">
          <DonutChart data={energyMix} size="large" />
          <div className="mix-matrix">
            {energyMix.map((item) => (
              <article key={item.name} className="energy-tile">
                <span className="dot" style={{ background: item.color }} />
                <h3>{item.name}</h3>
                <strong>{item.value}%</strong>
                <p>{item.co2} gCO2e/kWh ordre de grandeur</p>
                <em>{item.trend} pts</em>
              </article>
            ))}
          </div>
        </div>
      </Panel>

      <Panel className="span-6">
        <SectionHeader icon={Database} eyebrow="ODRE" title="Themes les plus presents" />
        <HorizontalBars data={themes} valueKey="count" />
      </Panel>

      <Panel className="span-6">
        <SectionHeader icon={Flame} eyebrow="ODRE" title="Energies couvertes" />
        <HorizontalBars data={energies} valueKey="count" />
      </Panel>

      <Panel className="span-12">
        <SectionHeader icon={Factory} eyebrow="Gaz" title="Scenarios de consommation 2030 / 2035" />
        <LineChart
          data={gasScenarios}
          xKey="label"
          keys={["basse", "fit55", "haute"]}
          colors={{ basse: "#2dd4bf", fit55: "#38bdf8", haute: "#fb7185" }}
          height={280}
        />
      </Panel>
    </div>
  );
}

function FluxPage() {
  return (
    <div className="page-grid">
      <Panel className="span-8">
        <SectionHeader icon={Waves} eyebrow="Production" title="Production par famille d'energie" />
        <LineChart
          data={productionTrend}
          xKey="year"
          keys={["nucleaire", "renouvelables", "gaz", "fossiles"]}
          colors={lineColors}
          height={340}
        />
      </Panel>
      <Panel className="span-4">
        <SectionHeader icon={CircleGauge} eyebrow="Signal" title="Capacite bas-carbone" />
        <GaugeStack
          items={[
            { label: "Pilotable", value: 82, color: "#a78bfa" },
            { label: "Variable", value: 46, color: "#2dd4bf" },
            { label: "Stockage", value: 28, color: "#facc15" },
            { label: "Interconnexions", value: 61, color: "#38bdf8" }
          ]}
        />
      </Panel>
      <Panel className="span-12">
        <SectionHeader icon={BatteryCharging} eyebrow="Consommation" title="Demande finale par secteur" />
        <LineChart
          data={consumptionTrend}
          xKey="year"
          keys={["residentiel", "tertiaire", "industrie", "transport", "agriculture"]}
          colors={lineColors}
          height={320}
        />
      </Panel>
    </div>
  );
}

function CarbonPage({ methaneSeries }) {
  return (
    <div className="page-grid">
      <Panel className="span-8">
        <SectionHeader icon={Leaf} eyebrow="Emissions" title="Trajectoire carbone par secteur" />
        <LineChart
          data={emissionsTrend}
          xKey="year"
          keys={["energie", "transport", "industrie", "batiments", "agriculture"]}
          colors={lineColors}
          height={340}
        />
      </Panel>
      <Panel className="span-4">
        <SectionHeader icon={Flame} eyebrow="Methane" title="Emissions directes reseaux gaz" />
        <LineChart
          data={methaneSeries}
          xKey="year"
          keys={["methane"]}
          colors={{ methane: "#fb7185" }}
          height={220}
          compact
        />
        <div className="carbon-callout">
          <strong>-58%</strong>
          <span>Signal de baisse depuis 2016 dans le cache statique ou le fallback.</span>
        </div>
      </Panel>
      <Panel className="span-12">
        <SectionHeader icon={Layers3} eyebrow="Actions" title="Leviers impact / complexite" />
        <ImpactMatrix />
      </Panel>
    </div>
  );
}

function TerritoriesPage({ selectedRegion, setSelectedRegion }) {
  return (
    <div className="page-grid">
      <Panel className="span-8 map-panel">
        <SectionHeader icon={MapIcon} eyebrow="France" title="Carte interactive des signaux territoriaux" />
        <MiniFranceMap selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} />
      </Panel>
      <Panel className="span-4">
        <SectionHeader icon={Orbit} eyebrow="Region cible" title={selectedRegion.region} />
        <div className="region-detail">
          <RadialMeter label="Intensite energie" value={selectedRegion.intensity} color="#38bdf8" />
          <RadialMeter label="Renouvelables" value={selectedRegion.renewable} color="#2dd4bf" />
          <RadialMeter label="Risque carbone" value={selectedRegion.co2 * 3} color="#fb7185" />
        </div>
        <div className="region-focus">
          <strong>{selectedRegion.focus}</strong>
          <p>
            {selectedRegion.consumption} TWh de consommation estimee, {selectedRegion.co2} MtCO2e
            de pression carbone.
          </p>
        </div>
      </Panel>
      <Panel className="span-12">
        <SectionHeader icon={BarChart3} eyebrow="Classement" title="Regions par signal renouvelable" />
        <RegionTable />
      </Panel>
    </div>
  );
}

function WorldPage({ scope, setScope, scopeDiagnostics, snapshot, refresh }) {
  const [selectedWorldLabel, setSelectedWorldLabel] = useState("France");
  const [worldMode, setWorldMode] = useState("Risque");
  const selectedWorldSignal =
    globalSignals.find((signal) => signal.label === selectedWorldLabel) || globalSignals[0];

  return (
    <div className="page-grid">
      <section className="world-globe-stage span-12">
        <SectionHeader
          icon={Globe2}
          eyebrow="Monde 3D"
          title="Carte globale energie-climat"
          action={
            <button className="secondary-button" onClick={() => setScope(scope === "Monde" ? "France" : "Monde")}>
              <Globe2 size={18} />
              Basculer {scope === "Monde" ? "France" : "Monde"}
            </button>
          }
        />
        <div className="world-globe-layout">
          <WorldGlobe3D
            signals={globalSignals}
            selectedLabel={selectedWorldLabel}
            mode={worldMode}
            onSelect={setSelectedWorldLabel}
          />
          <div className="world-control-panel">
            <SegmentedControl
              value={worldMode}
              onChange={setWorldMode}
              items={["Risque", "Bas-carbone", "Demande"]}
              label="Lecture globe"
            />
            <div className="world-focus">
              <span>
                <Target size={16} />
                Zone active
              </span>
              <strong>{selectedWorldSignal.label}</strong>
              <p>{selectedWorldSignal.note}</p>
              <div className="world-focus__stats">
                <small>{selectedWorldSignal.lowCarbon}% bas-carbone</small>
                <small>{selectedWorldSignal.fossil}% fossile</small>
                <small>{selectedWorldSignal.momentum} dynamique</small>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Panel className="span-8">
        <SectionHeader icon={Activity} eyebrow="Signaux" title="Radar des zones mondiales" />
        <WorldPulse
          selectedLabel={selectedWorldLabel}
          onSelect={setSelectedWorldLabel}
          mode={worldMode}
        />
      </Panel>
      <Panel className="span-4">
        <SectionHeader icon={RadioTower} eyebrow="API check" title="Bascule France / Monde" />
        <ScopeDataPanel diagnostics={scopeDiagnostics} snapshot={snapshot} onRefresh={refresh} />
      </Panel>
      <Panel className="span-7">
        <SectionHeader icon={BarChart3} eyebrow="Mix global" title="Fossile vs bas-carbone" />
        <ComparativeBars selectedLabel={selectedWorldLabel} onSelect={setSelectedWorldLabel} />
      </Panel>
      <Panel className="span-5">
        <SectionHeader icon={Activity} eyebrow="Timeline" title="Moments de transition" />
        <Timeline />
      </Panel>
    </div>
  );
}

function SimulatorPage() {
  const [sobriety, setSobriety] = useState(18);
  const [renewables, setRenewables] = useState(34);
  const [electrification, setElectrification] = useState(28);
  const [gasShift, setGasShift] = useState(21);

  const projectedEmissions = clamp(
    403 - sobriety * 2.8 - renewables * 1.35 - electrification * 1.15 - gasShift * 1.55,
    112,
    430
  );
  const renewableShare = clamp(27 + renewables * 0.46 + electrification * 0.14, 20, 72);
  const resilience = clamp(42 + sobriety * 0.22 + renewables * 0.31 + electrification * 0.18 + gasShift * 0.16, 35, 91);
  const investment = Math.round(18 + renewables * 0.9 + electrification * 1.2 + gasShift * 0.7);

  return (
    <div className="page-grid">
      <Panel className="span-7">
        <SectionHeader icon={BrainCircuit} eyebrow="Scenario lab" title="Construire un scenario 2030" />
        <div className="slider-stack">
          <RangeControl
            label="Sobriete demande"
            value={sobriety}
            onChange={setSobriety}
            icon={Activity}
          />
          <RangeControl
            label="Acceleration renouvelables"
            value={renewables}
            onChange={setRenewables}
            icon={SunMedium}
          />
          <RangeControl
            label="Electrification usages"
            value={electrification}
            onChange={setElectrification}
            icon={Bolt}
          />
          <RangeControl
            label="Sortie gaz fossile"
            value={gasShift}
            onChange={setGasShift}
            icon={Flame}
          />
        </div>
      </Panel>
      <Panel className="span-5">
        <SectionHeader icon={Sparkles} eyebrow="Resultat" title="Impact estime" />
        <div className="scenario-results">
          <MetricCard
            label="Emissions nationales"
            value={formatNumber(projectedEmissions)}
            unit="Mt"
            delta={`${formatNumber(403 - projectedEmissions)} Mt evitees`}
            tone="green"
            detail="Mode pedagogique"
          />
          <MetricCard
            label="Part renouvelables"
            value={`${Math.round(renewableShare)}%`}
            delta="+ capacite flexible requise"
            tone="cyan"
            detail="Electricite + chaleur"
          />
          <MetricCard
            label="Resilience systeme"
            value={`${Math.round(resilience)}%`}
            delta={`${investment} MdEUR/an ordre de grandeur`}
            tone="violet"
            detail="Investissement estime"
          />
        </div>
      </Panel>
      <Panel className="span-12">
        <SectionHeader icon={Orbit} eyebrow="Projection" title="Onde de transition" />
        <ScenarioWave
          sobriety={sobriety}
          renewables={renewables}
          electrification={electrification}
          gasShift={gasShift}
        />
      </Panel>
    </div>
  );
}

function DataExplorerPage({ catalog }) {
  const [query, setQuery] = useState("energie");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("Toutes");

  const filteredCatalog = useMemo(() => {
    const source = searchResults.length ? searchResults : catalog;
    return source.filter((dataset) => sourceFilter === "Toutes" || dataset.source === sourceFilter);
  }, [catalog, searchResults, sourceFilter]);

  function runSearch(event) {
    event.preventDefault();
    setIsSearching(true);
    const needle = query.trim().toLowerCase();
    const results = needle
      ? catalog.filter((dataset) =>
          [
            dataset.title,
            dataset.source,
            dataset.publisher,
            dataset.theme,
            dataset.energy,
            ...(dataset.formats || [])
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(needle)
        )
      : catalog;

    setSearchResults(results);
    window.setTimeout(() => setIsSearching(false), 180);
  }

  function exportCsv() {
    const headers = ["source", "titre", "editeur", "theme", "energie", "score", "ressources", "url"];
    const rows = filteredCatalog.map((dataset) => [
      dataset.source,
      dataset.title,
      dataset.publisher,
      dataset.theme,
      dataset.energy,
      Math.round(dataset.quality || 0),
      dataset.records || 0,
      dataset.page || ""
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mission-control-datasets-${sourceFilter.toLowerCase().replaceAll(".", "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="page-grid">
      <Panel className="span-12">
        <SectionHeader
          icon={Search}
          eyebrow="Catalogue"
          title="Explorer les donnees energie / ecologie"
          action={
            <button className="secondary-button" onClick={exportCsv}>
              <Download size={17} />
              Export CSV
            </button>
          }
        />
        <form className="search-bar" onSubmit={runSearch}>
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher: energie, climat, gaz, solaire..."
          />
          <button className="primary-button" disabled={isSearching}>
            {isSearching ? "Recherche..." : "Rechercher"}
          </button>
        </form>
        <div className="filter-row">
          {["Toutes", "ODRE", "data.gouv.fr"].map((source) => (
            <button
              key={source}
              className={sourceFilter === source ? "chip active" : "chip"}
              onClick={() => setSourceFilter(source)}
            >
              {source}
            </button>
          ))}
        </div>
      </Panel>
      <Panel className="span-12">
        <div className="dataset-grid">
          {filteredCatalog.slice(0, 24).map((dataset) => (
            <DatasetCard key={`${dataset.source}-${dataset.id}`} dataset={dataset} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function SourcesPage({ snapshot, totalDatasets, catalog }) {
  const publishers = snapshot.odre?.publishers?.length
    ? snapshot.odre.publishers
    : fallbackSnapshot.odre.publishers;

  return (
    <div className="page-grid">
      <Panel className="span-7">
        <SectionHeader icon={Network} eyebrow="Constellation" title="Cartographie des sources" />
        <SourceOrbit />
      </Panel>
      <Panel className="span-5">
        <SectionHeader icon={Database} eyebrow="Couverture" title={`${formatNumber(totalDatasets)} datasets reperes`} />
        <HorizontalBars data={publishers} valueKey="count" />
      </Panel>
      <Panel className="span-12">
        <SectionHeader icon={ShieldCheck} eyebrow="Robustesse" title="Strategie anti-bug de demo" />
        <div className="safety-grid">
          <article>
            <strong>Build statique</strong>
            <p>GitHub Actions appelle les APIs publiques, puis publie un JSON pret pour GitHub Pages.</p>
          </article>
          <article>
            <strong>Cache programme</strong>
            <p>Les APIs publiques sont appelees par GitHub Actions, puis servies en JSON statique.</p>
          </article>
          <article>
            <strong>Fallback embarque</strong>
            <p>Si le Wi-Fi tombe, les pages, graphes et interactions restent utilisables.</p>
          </article>
          <article>
            <strong>Sources visibles</strong>
            <p>{catalog.length} cartes datasets gardent le lien vers ODRE et data.gouv.fr.</p>
          </article>
        </div>
      </Panel>
    </div>
  );
}

function DonutChart({ data, size = "normal" }) {
  let current = 0;
  const gradient = data
    .map((item) => {
      const start = current;
      const end = current + item.value;
      current = end;
      return `${item.color} ${start}% ${end}%`;
    })
    .join(", ");
  const totalLowCarbon = data
    .filter((item) => !["Gaz", "Charbon/Fioul"].includes(item.name))
    .reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={`donut-wrap ${size}`}>
      <div className="donut" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="donut-hole">
          <strong>{totalLowCarbon}%</strong>
          <span>bas-carbone</span>
        </div>
      </div>
    </div>
  );
}

function HorizontalBars({ data, valueKey = "value" }) {
  const max = Math.max(...data.map((item) => item[valueKey] || 0), 1);

  return (
    <div className="bars">
      {data.map((item, index) => (
        <div key={item.name || item.label} className="bar-row">
          <div className="bar-row__label">
            <span>{item.name || item.label}</span>
            <strong>{item[valueKey]}</strong>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${((item[valueKey] || 0) / max) * 100}%`,
                background: item.color || `hsl(${190 + index * 22} 82% 58%)`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, xKey, keys, colors, height = 260, compact = false }) {
  const width = 860;
  const padding = compact ? 24 : 42;
  const values = data.flatMap((item) => keys.map((key) => Number(item[key]) || 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const yRange = Math.max(max - min, 1);

  function point(item, index, key) {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (((Number(item[key]) || 0) - min) / yRange) * (height - padding * 2);
    return [x, y];
  }

  function pathFor(key) {
    return data
      .map((item, index) => {
        const [x, y] = point(item, index, key);
        return `${index ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <div className="chart-shell" style={{ height }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Graphique temporel">
        <defs>
          <linearGradient id="chartGlow" x1="0" x2="1" y1="0" y2="0">
            <stop stopColor="#38bdf8" stopOpacity="0.2" />
            <stop offset="1" stopColor="#2dd4bf" stopOpacity="0.75" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = padding + (line / 3) * (height - padding * 2);
          return <line key={line} x1={padding} y1={y} x2={width - padding} y2={y} className="grid-line" />;
        })}
        {keys.map((key) => (
          <path
            key={key}
            d={pathFor(key)}
            fill="none"
            stroke={colors[key] || "#38bdf8"}
            strokeWidth={compact ? 3 : 4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {data.map((item, index) => (
          <g key={`${item[xKey]}-${index}`}>
            <text
              x={padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2)}
              y={height - 12}
              textAnchor="middle"
              className="chart-label"
            >
              {item[xKey]}
            </text>
          </g>
        ))}
      </svg>
      <div className="chart-legend">
        {keys.map((key) => (
          <span key={key}>
            <i style={{ background: colors[key] || "#38bdf8" }} />
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}

function GaugeStack({ items }) {
  return (
    <div className="gauge-stack">
      {items.map((item) => (
        <RadialMeter key={item.label} {...item} />
      ))}
    </div>
  );
}

function RadialMeter({ label, value, color }) {
  const normalized = clamp(value, 0, 100);
  return (
    <div className="radial-meter">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="48" className="meter-bg" />
        <circle
          cx="60"
          cy="60"
          r="48"
          className="meter-value"
          style={{
            stroke: color,
            strokeDasharray: `${normalized * 3.01} 301`
          }}
        />
      </svg>
      <strong>{Math.round(normalized)}%</strong>
      <span>{label}</span>
    </div>
  );
}

function MiniFranceMap({ selectedRegion, setSelectedRegion, compact = false }) {
  const regionSignalsById = new Map(regionalSignals.map((region) => [region.id, region]));

  function selectRegion(regionPath) {
    const signal = regionSignalsById.get(regionPath.id);
    if (signal) setSelectedRegion(signal);
  }

  function regionTone(signal) {
    if (!signal) return 0.35;
    return 0.28 + signal.intensity / 170;
  }

  return (
    <div className={compact ? "france-map compact" : "france-map"}>
      <svg viewBox={franceMapViewBox} role="img" aria-label="Carte interactive des regions de France">
        <defs>
          <filter id="regionGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#2dd4bf" floodOpacity="0.35" />
          </filter>
        </defs>

        <g className="region-paths">
          {franceRegionPaths.map((regionPath) => {
            const signal = regionSignalsById.get(regionPath.id);
            const selected = selectedRegion.id === regionPath.id;
            const label = signal?.region || regionPath.name;

            return (
              <path
                key={regionPath.id}
                className={selected ? "france-region selected" : "france-region"}
                d={regionPath.d}
                style={{ "--region-tone": regionTone(signal) }}
                tabIndex="0"
                role="button"
                aria-label={label}
                onClick={() => selectRegion(regionPath)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectRegion(regionPath);
                  }
                }}
              >
                <title>{label}</title>
              </path>
            );
          })}
        </g>

        <g className="region-labels" aria-hidden="true">
          {franceRegionPaths.map((regionPath) => {
            const signal = regionSignalsById.get(regionPath.id);
            const selected = selectedRegion.id === regionPath.id;
            return (
              <text
                key={regionPath.id}
                x={regionPath.labelX}
                y={regionPath.labelY}
                textAnchor="middle"
                className={selected ? "region-text selected" : "region-text"}
              >
                {regionPath.label}
              </text>
            );
          })}
        </g>

        {!compact && (
          <g className="map-compass" aria-hidden="true">
            <circle cx="560" cy="86" r="31" />
            <path d="M560 58 L568 88 L560 80 L552 88 Z" />
            <text x="560" y="106" textAnchor="middle">
              N
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

function RegionTable() {
  const sorted = [...regionalSignals].sort((a, b) => b.renewable - a.renewable);

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Region</th>
            <th>Renouvelables</th>
            <th>Consommation</th>
            <th>Signal prioritaire</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((region) => (
            <tr key={region.id}>
              <td>{region.region}</td>
              <td>{region.renewable}%</td>
              <td>{region.consumption} TWh</td>
              <td>{region.focus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImpactMatrix() {
  const levers = [
    { label: "Renovation batiments", impact: 86, complexity: 73, color: "#38bdf8" },
    { label: "Transport electrifie", impact: 78, complexity: 66, color: "#a78bfa" },
    { label: "Solaire distribue", impact: 61, complexity: 38, color: "#facc15" },
    { label: "Biomethane", impact: 49, complexity: 58, color: "#2dd4bf" },
    { label: "Sobriete pointe", impact: 54, complexity: 24, color: "#84cc16" },
    { label: "Hydrogene industrie", impact: 68, complexity: 82, color: "#fb7185" }
  ];

  return (
    <div className="impact-matrix">
      {levers.map((lever) => (
        <span
          key={lever.label}
          className="matrix-dot"
          style={{
            left: `${lever.complexity}%`,
            top: `${100 - lever.impact}%`,
            background: lever.color
          }}
          title={`${lever.label}: impact ${lever.impact}, complexite ${lever.complexity}`}
        >
          {lever.label}
        </span>
      ))}
      <span className="axis x">complexite</span>
      <span className="axis y">impact</span>
    </div>
  );
}

function WorldGlobe3D({ signals, selectedLabel, mode, onSelect }) {
  const canvasRef = useRef(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let cancelled = false;
    let cleanup = () => {};
    let upgradeTimer = 0;

    cleanup = startCanvasGlobe(canvas, signals, selectedLabel, mode, onSelectRef);

    async function bootGlobe() {
      try {
        const THREE = await import(/* @vite-ignore */ "https://esm.sh/three@0.184.0");
        if (!cancelled) {
          const probe = document.createElement("canvas");
          const hasWebGL = Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
          if (!hasWebGL) return;

          const threeCanvas = document.createElement("canvas");
          threeCanvas.className = "globe-three-layer";
          canvas.after(threeCanvas);

          const fallbackCleanup = cleanup;
          let threeCleanup = () => {};
          try {
            threeCleanup = startThreeGlobe(
              threeCanvas,
              THREE,
              signals,
              selectedLabel,
              mode,
              onSelectRef
            );
          } catch {
            threeCanvas.remove();
            return;
          }
          fallbackCleanup();
          canvas.style.opacity = "0";
          cleanup = () => {
            threeCleanup();
            threeCanvas.remove();
            canvas.style.opacity = "";
          };
        }
      } catch {}
    }

    upgradeTimer = window.setTimeout(bootGlobe, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(upgradeTimer);
      cleanup();
    };
  }, [mode, selectedLabel, signals]);

  return (
    <div className="world-globe-canvas" aria-label="Carte du monde 3D interactive">
      <canvas ref={canvasRef} />
      <div className="globe-hud" aria-hidden="true">
        <span>{worldMetricLabel(mode)}</span>
        <strong>{selectedLabel}</strong>
      </div>
    </div>
  );
}

function startThreeGlobe(canvas, THREE, signals, selectedLabel, mode, onSelectRef) {
  const parent = canvas.parentElement;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
  });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const group = new THREE.Group();
  const markerGroup = new THREE.Group();
  const selectedSignal = signals.find((signal) => signal.label === selectedLabel) || signals[0];
  let frame = 0;
  let renderFrame = 0;

  canvas.dataset.renderMode = "three";
  camera.position.set(0, 0.45, 7.2);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  scene.add(group);
  scene.add(new THREE.AmbientLight(0x87d9ff, 1.25));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.35);
  keyLight.position.set(4, 3, 5);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0x2dd4bf, 3.4, 12);
  rimLight.position.set(-3.5, 1.6, 3.8);
  scene.add(rimLight);

  const texture = new THREE.CanvasTexture(createWorldTexture(signals, selectedLabel, mode));
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(2.35, 96, 64),
    new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.78,
      metalness: 0.06
    })
  );
  group.add(globe);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(2.42, 96, 64),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.11,
      side: THREE.BackSide
    })
  );
  group.add(atmosphere);

  const starsGeometry = new THREE.BufferGeometry();
  const starPositions = [];
  for (let index = 0; index < 420; index += 1) {
    const radius = 7 + Math.random() * 5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    starPositions.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    );
  }
  starsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starsGeometry,
    new THREE.PointsMaterial({ color: 0xbfefff, size: 0.025, transparent: true, opacity: 0.62 })
  );
  scene.add(stars);

  const franceSignal = signals.find((signal) => signal.label === "France") || selectedSignal;
  signals.forEach((signal) => {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(signal.label === selectedLabel ? 0.082 : 0.058, 24, 16),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(signal.label === selectedLabel ? "#ffffff" : signal.color),
        transparent: true,
        opacity: signal.label === selectedLabel ? 1 : 0.86
      })
    );
    marker.position.copy(latLonToVector3(THREE, signal.lat, signal.lon, 2.43));
    marker.userData.label = signal.label;
    markerGroup.add(marker);

    if (signal.label !== "France" && signal.label !== "Monde") {
      group.add(createGlobeArc(THREE, franceSignal, signal, signal.color));
    }
  });
  group.add(markerGroup);

  function resize() {
    const rect = parent.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(360, Math.floor(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function handlePointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(markerGroup.children, false)[0];
    if (hit?.object?.userData?.label) {
      onSelectRef.current(hit.object.userData.label);
    }
  }

  function animate() {
    frame = requestAnimationFrame(animate);
    renderFrame += 1;
    group.rotation.y += 0.0028;
    group.rotation.x = -0.13 + Math.sin(Date.now() / 2400) * 0.015;
    markerGroup.children.forEach((marker) => {
      const active = marker.userData.label === selectedLabel;
      const pulse = active ? 1 + Math.sin(Date.now() / 180) * 0.08 : 1;
      marker.scale.setScalar(pulse);
    });
    stars.rotation.y -= 0.0007;
    renderer.render(scene, camera);
    if (renderFrame % 12 === 0) {
      canvas.dataset.renderFrame = String(renderFrame);
      canvas.dataset.pixelReady = "true";
    }
  }

  resize();
  renderer.render(scene, camera);
  canvas.dataset.renderFrame = "1";
  canvas.dataset.pixelReady = "true";
  canvas.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("resize", resize);
  animate();

  return () => {
    cancelAnimationFrame(frame);
    canvas.removeEventListener("pointerdown", handlePointerDown);
    window.removeEventListener("resize", resize);
    texture.dispose();
    renderer.dispose();
    scene.traverse((object) => {
      object.geometry?.dispose?.();
      object.material?.dispose?.();
    });
  };
}

function startCanvasGlobe(canvas, signals, selectedLabel, mode, onSelectRef) {
  const context = canvas.getContext("2d");
  const parent = canvas.parentElement;
  const markerHits = [];
  let frame = 0;
  let renderFrame = 0;
  let rotation = 0;

  canvas.dataset.renderMode = "canvas";
  function resize() {
    const rect = parent.getBoundingClientRect();
    const ratio = 1;
    canvas.width = Math.max(320, Math.floor(rect.width * ratio));
    canvas.height = Math.max(360, Math.floor(rect.height * ratio));
    canvas.style.width = `${Math.max(320, Math.floor(rect.width))}px`;
    canvas.style.height = `${Math.max(360, Math.floor(rect.height))}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function project(lat, lon, radius, centerX, centerY) {
    const phi = (lat * Math.PI) / 180;
    const lambda = ((lon * Math.PI) / 180) + rotation;
    const x = Math.cos(phi) * Math.sin(lambda);
    const y = Math.sin(phi);
    const z = Math.cos(phi) * Math.cos(lambda);
    return {
      x: centerX + x * radius,
      y: centerY - y * radius,
      z
    };
  }

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.36;
    markerHits.length = 0;
    rotation += 0.004;
    renderFrame += 1;

    context.clearRect(0, 0, width, height);
    const glow = context.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.2);
    glow.addColorStop(0, "rgba(56,189,248,0.24)");
    glow.addColorStop(1, "rgba(56,189,248,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    const ocean = context.createRadialGradient(centerX - radius * 0.25, centerY - radius * 0.35, 0, centerX, centerY, radius);
    ocean.addColorStop(0, "#163449");
    ocean.addColorStop(0.62, "#0b1e2d");
    ocean.addColorStop(1, "#07111b");
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fillStyle = ocean;
    context.fill();
    context.save();
    context.clip();

    context.strokeStyle = "rgba(159,221,244,0.13)";
    context.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) {
      context.beginPath();
      for (let lon = -180; lon <= 180; lon += 8) {
        const point = project(lat, lon, radius, centerX, centerY);
        if (point.z < -0.25) continue;
        context[lon === -180 ? "moveTo" : "lineTo"](point.x, point.y);
      }
      context.stroke();
    }

    worldLandShapes.forEach((shape) => {
      context.beginPath();
      shape.points.forEach(([lat, lon], index) => {
        const point = project(lat, lon, radius, centerX, centerY);
        context[index ? "lineTo" : "moveTo"](point.x, point.y);
      });
      context.closePath();
      context.fillStyle = "rgba(45,212,191,0.34)";
      context.strokeStyle = "rgba(238,245,248,0.24)";
      context.lineWidth = 1.2;
      context.fill();
      context.stroke();
    });

    signals.forEach((signal) => {
      const point = project(signal.lat, signal.lon, radius * 1.03, centerX, centerY);
      if (point.z < -0.12) return;
      const active = signal.label === selectedLabel;
      const dotRadius = active ? 8 : 5;
      context.beginPath();
      context.arc(point.x, point.y, dotRadius + 7, 0, Math.PI * 2);
      context.fillStyle = active ? "rgba(255,255,255,0.15)" : "rgba(45,212,191,0.08)";
      context.fill();
      context.beginPath();
      context.arc(point.x, point.y, dotRadius, 0, Math.PI * 2);
      context.fillStyle = active ? "#ffffff" : signal.color;
      context.fill();
      markerHits.push({ label: signal.label, x: point.x, y: point.y, radius: dotRadius + 10 });
    });

    context.restore();
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.strokeStyle = "rgba(238,245,248,0.28)";
    context.lineWidth = 1.4;
    context.stroke();

    context.fillStyle = "rgba(238,245,248,0.8)";
    context.font = "700 12px system-ui";
    context.fillText(`${worldMetricLabel(mode)}: ${selectedLabel}`, 18, height - 20);
    canvas.dataset.renderFrame = String(renderFrame);
    canvas.dataset.pixelReady = "true";
    frame = window.setTimeout(() => requestAnimationFrame(draw), 34);
  }

  function handlePointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = markerHits.find((marker) => Math.hypot(marker.x - x, marker.y - y) <= marker.radius);
    if (hit) onSelectRef.current(hit.label);
  }

  resize();
  canvas.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("resize", resize);
  draw();

  return () => {
    window.clearTimeout(frame);
    canvas.removeEventListener("pointerdown", handlePointerDown);
    window.removeEventListener("resize", resize);
  };
}

function latLonToVector3(THREE, lat, lon, radius) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function createGlobeArc(THREE, startSignal, endSignal, color) {
  const start = latLonToVector3(THREE, startSignal.lat, startSignal.lon, 2.46);
  const end = latLonToVector3(THREE, endSignal.lat, endSignal.lon, 2.46);
  const middle = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(3.25);
  const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(46));
  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.48
    })
  );
}

function createWorldTexture(signals, selectedLabel, mode) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 1024;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 1024, 512);
  gradient.addColorStop(0, "#07111b");
  gradient.addColorStop(0.52, "#0d2a3e");
  gradient.addColorStop(1, "#041018");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 512);

  context.strokeStyle = "rgba(159,221,244,0.12)";
  context.lineWidth = 1;
  for (let lon = -150; lon <= 150; lon += 30) {
    const x = ((lon + 180) / 360) * 1024;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, 512);
    context.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * 512;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(1024, y);
    context.stroke();
  }

  worldLandShapes.forEach((shape) => {
    context.beginPath();
    shape.points.forEach(([lat, lon], index) => {
      const x = ((lon + 180) / 360) * 1024;
      const y = ((90 - lat) / 180) * 512;
      context[index ? "lineTo" : "moveTo"](x, y);
    });
    context.closePath();
    context.fillStyle = "rgba(45,212,191,0.34)";
    context.strokeStyle = "rgba(238,245,248,0.22)";
    context.lineWidth = 2;
    context.fill();
    context.stroke();
  });

  signals.forEach((signal) => {
    const x = ((signal.lon + 180) / 360) * 1024;
    const y = ((90 - signal.lat) / 180) * 512;
    const active = signal.label === selectedLabel;
    context.beginPath();
    context.arc(x, y, active ? 15 : 10, 0, Math.PI * 2);
    context.fillStyle = active ? "rgba(255,255,255,0.9)" : signal.color;
    context.fill();
    context.font = "700 18px system-ui";
    context.fillStyle = active ? "#ffffff" : "rgba(238,245,248,0.78)";
    context.fillText(String(worldMetric(signal, mode)), x + 16, y + 6);
  });

  return textureCanvas;
}

function ScopeDataPanel({ diagnostics, snapshot, onRefresh }) {
  const health = snapshot.apiHealth || [];
  const generated = diagnostics.generatedAt
    ? diagnostics.generatedAt.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "cache local";

  return (
    <div className="scope-data-panel">
      <div className="scope-data-score">
        <strong>{diagnostics.liveSources}/4</strong>
        <span>sources cache valides</span>
      </div>
      <p>{diagnostics.detail}</p>
      <div className="scope-data-grid">
        <span>{diagnostics.catalogCount} cartes data</span>
        <span>{diagnostics.odreCount} ODRE</span>
        <span>{diagnostics.dataGouvCount} data.gouv.fr</span>
        <span>{generated}</span>
      </div>
      <div className="mini-health-list">
        {health.map((source) => (
          <span key={source.name}>
            <i className={`health-led ${source.status}`} />
            {source.name}
          </span>
        ))}
      </div>
      <button className="secondary-button" onClick={onRefresh}>
        <RefreshCw size={17} />
        Relire le cache
      </button>
    </div>
  );
}

function WorldPulse({ selectedLabel, onSelect, mode }) {
  return (
    <div className="world-pulse">
      {globalSignals.map((signal, index) => (
        <button
          key={signal.label}
          className={signal.label === selectedLabel ? "world-card active" : "world-card"}
          style={{ "--delay": `${index * 0.12}s`, "--accent": signal.color }}
          onClick={() => onSelect(signal.label)}
          title={`Analyser ${signal.label}`}
        >
          <span>{signal.label}</span>
          <strong>{worldMetric(signal, mode)}{mode === "Demande" ? "" : "%"}</strong>
          <small>{worldMetricLabel(mode)}</small>
          <div className="world-meter">
            <i style={{ width: `${signal.fossil}%` }} />
          </div>
          <em>risque {signal.risk}</em>
        </button>
      ))}
    </div>
  );
}

function ComparativeBars({ selectedLabel, onSelect }) {
  return (
    <div className="comparative-bars">
      {globalSignals.map((signal) => (
        <button
          key={signal.label}
          className={signal.label === selectedLabel ? "compare-row active" : "compare-row"}
          onClick={() => onSelect(signal.label)}
        >
          <span>{signal.label}</span>
          <div className="compare-track">
            <i className="fossil" style={{ width: `${signal.fossil}%` }} />
            <i className="low" style={{ width: `${signal.lowCarbon}%` }} />
          </div>
          <strong>{signal.lowCarbon}%</strong>
        </button>
      ))}
    </div>
  );
}

function Timeline() {
  return (
    <div className="timeline">
      {timelineMoments.map((moment) => (
        <article key={moment.year}>
          <strong>{moment.year}</strong>
          <div>
            <h3>{moment.title}</h3>
            <p>{moment.signal}</p>
          </div>
          <span>{moment.score}</span>
        </article>
      ))}
    </div>
  );
}

function RangeControl({ label, value, onChange, icon: Icon }) {
  return (
    <label className="range-control">
      <span>
        <Icon size={18} />
        {label}
      </span>
      <strong>{value}%</strong>
      <input
        type="range"
        min="0"
        max="60"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ScenarioWave({ sobriety, renewables, electrification, gasShift }) {
  const values = [
    { label: "Sobriete", value: sobriety, color: "#84cc16" },
    { label: "ENR", value: renewables, color: "#2dd4bf" },
    { label: "Elec.", value: electrification, color: "#38bdf8" },
    { label: "Gaz", value: gasShift, color: "#fb7185" }
  ];

  return (
    <div className="scenario-wave">
      {values.map((item, index) => (
        <div
          key={item.label}
          className="wave-column"
          style={{
            height: `${120 + item.value * 4}px`,
            background: `linear-gradient(180deg, ${item.color}, transparent)`,
            animationDelay: `${index * 0.14}s`
          }}
        >
          <span>{item.label}</span>
          <strong>{item.value}%</strong>
        </div>
      ))}
    </div>
  );
}

function DatasetCard({ dataset }) {
  return (
    <article className="dataset-card">
      <div className="dataset-card__top">
        <StatusPill label={dataset.source} tone={dataset.source === "ODRE" ? "live" : "neutral"} />
        <span>{Math.round(dataset.quality || 0)} score</span>
      </div>
      <h3>{dataset.title}</h3>
      <p>{dataset.publisher || "Source publique"}</p>
      <div className="dataset-meta">
        <span>{dataset.theme || "energie"}</span>
        <span>{dataset.energy || "multi"}</span>
        <span>{formatNumber(dataset.records)} ressources/enregs</span>
      </div>
      <div className="dataset-formats">
        {(dataset.formats || []).slice(0, 4).map((format) => (
          <i key={format}>{format}</i>
        ))}
      </div>
      {dataset.page && (
        <a href={dataset.page} target="_blank" rel="noreferrer">
          Ouvrir la source <ChevronRight size={15} />
        </a>
      )}
    </article>
  );
}

function SourceOrbit() {
  const centerX = 340;
  const centerY = 240;
  const radius = 170;

  return (
    <div className="source-orbit">
      <svg viewBox="0 0 680 480" role="img" aria-label="Constellation des sources">
        <circle cx={centerX} cy={centerY} r={70} className="orbit-core" />
        <text x={centerX} y={centerY - 6} textAnchor="middle" className="orbit-title">
          DATA
        </text>
        <text x={centerX} y={centerY + 18} textAnchor="middle" className="orbit-subtitle">
          ENERGY
        </text>
        <circle cx={centerX} cy={centerY} r={radius} className="orbit-line" />
        <circle cx={centerX} cy={centerY} r={radius - 58} className="orbit-line soft" />
        {sourceFamilies.map((source, index) => {
          const angle = (index / sourceFamilies.length) * Math.PI * 2 - Math.PI / 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          return (
            <g key={source.label}>
              <line x1={centerX} y1={centerY} x2={x} y2={y} className="orbit-link" />
              <circle cx={x} cy={y} r={22 + source.value / 10} fill={source.color} opacity="0.85" />
              <text x={x} y={y + 4} textAnchor="middle" className="orbit-node-text">
                {source.value}
              </text>
              <text x={x} y={y + 43} textAnchor="middle" className="orbit-label">
                {source.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default App;
