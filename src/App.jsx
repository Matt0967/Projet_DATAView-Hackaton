import {
  Activity,
  BarChart3,
  BatteryCharging,
  Bolt,
  BrainCircuit,
  ChevronRight,
  CircleGauge,
  Database,
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
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Waves,
  Zap
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
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

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value || 0));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

    fetch("/api/energy-intel")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API ${response.status}`);
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

  const apiLiveCount = (snapshot.apiHealth || []).filter((source) => source.status === "live").length;
  const totalDatasets =
    (snapshot.dataGouv?.total || fallbackSnapshot.dataGouv.total) +
    (snapshot.odre?.total || fallbackSnapshot.odre.total);

  const context = {
    snapshot,
    loading,
    error,
    refresh,
    activePage,
    setActivePage,
    scope,
    setScope,
    pulseMode,
    setPulseMode,
    selectedRegion,
    setSelectedRegion,
    catalog,
    methaneSeries,
    gasScenarios,
    apiLiveCount,
    totalDatasets
  };

  return (
    <div className="app-shell">
      <AmbientGrid />
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
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
        <p>Mode live API + fallback local pour garder une demo stable.</p>
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
  snapshot
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
        <button className="icon-button" onClick={refresh} title="Rafraichir les APIs">
          <RefreshCw size={18} className={loading ? "spin" : ""} />
        </button>
      </div>

      <div className="status-strip">
        <StatusPill
          label={`${apiLiveCount}/4 sources live`}
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
      return { ...kpi, delta: `${apiLiveCount} flux API actifs` };
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
        <SectionHeader icon={Activity} eyebrow="Flux API" title="Etat des sources publiques" />
        <div className="health-list">
          {liveSources.map((source) => (
            <div key={source.name} className="health-row">
              <span className={`health-led ${source.status}`} />
              <div>
                <strong>{source.name}</strong>
                <small>{source.error || `${source.latency || 0} ms`}</small>
              </div>
              <StatusPill
                label={source.status === "live" ? "live" : "fallback"}
                tone={source.status === "live" ? "live" : "warning"}
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
        <strong>{liveCount ? "LIVE" : "SAFE"}</strong>
        <small>{liveCount}/4 APIs</small>
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
          <span>Signal de baisse depuis 2016 dans le mode fallback / live records.</span>
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

function WorldPage({ scope, setScope }) {
  return (
    <div className="page-grid">
      <Panel className="span-12">
        <SectionHeader
          icon={Globe2}
          eyebrow="Monde"
          title="Comparateur global pour contextualiser la France"
          action={
            <button className="secondary-button" onClick={() => setScope(scope === "Monde" ? "France" : "Monde")}>
              <Globe2 size={18} />
              Basculer {scope === "Monde" ? "France" : "Monde"}
            </button>
          }
        />
        <WorldPulse />
      </Panel>
      <Panel className="span-7">
        <SectionHeader icon={BarChart3} eyebrow="Mix global" title="Fossile vs bas-carbone" />
        <ComparativeBars />
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
  const [remoteResults, setRemoteResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("Toutes");

  const filteredCatalog = useMemo(() => {
    const source = remoteResults.length ? remoteResults : catalog;
    return source.filter((dataset) => sourceFilter === "Toutes" || dataset.source === sourceFilter);
  }, [catalog, remoteResults, sourceFilter]);

  function runSearch(event) {
    event.preventDefault();
    setIsSearching(true);
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((response) => response.json())
      .then((data) => {
        const normalized = (data.datasets || []).map((dataset) => ({
          id: dataset.id,
          title: dataset.title,
          source: "data.gouv.fr",
          publisher: dataset.organization,
          theme: dataset.query,
          energy: (dataset.tags || []).slice(0, 3).join(", "),
          quality: dataset.quality,
          records: dataset.resources,
          page: dataset.page,
          formats: dataset.formats || []
        }));
        setRemoteResults(normalized);
      })
      .catch(() => setRemoteResults([]))
      .finally(() => setIsSearching(false));
  }

  return (
    <div className="page-grid">
      <Panel className="span-12">
        <SectionHeader icon={Search} eyebrow="Catalogue" title="Explorer les donnees energie / ecologie" />
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
            <strong>Backend proxy</strong>
            <p>Le navigateur parle au serveur local, ce qui reduit les soucis CORS et centralise les timeouts.</p>
          </article>
          <article>
            <strong>Cache 5 minutes</strong>
            <p>Les APIs publiques ne sont pas re-sollicitees a chaque navigation.</p>
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
  return (
    <div className={compact ? "france-map compact" : "france-map"}>
      <svg viewBox="0 0 660 690" role="img" aria-label="Carte interactive de la France">
        <path
          className="france-outline"
          d="M320 47 L418 80 L498 148 L530 244 L588 318 L552 430 L588 526 L522 594 L432 590 L353 640 L257 601 L186 530 L124 430 L82 321 L117 214 L196 127 Z"
        />
        {regionalSignals.map((region) => {
          const selected = selectedRegion.id === region.id;
          return (
            <g key={region.id}>
              <circle
                cx={region.x}
                cy={region.y}
                r={selected ? 26 : 19}
                className={selected ? "region-node selected" : "region-node"}
                style={{ "--intensity": region.intensity }}
                onClick={() => setSelectedRegion(region)}
              />
              <text x={region.x} y={region.y + 4} textAnchor="middle" className="region-text">
                {region.region
                  .split(" ")
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 3)}
              </text>
            </g>
          );
        })}
        {regionalSignals.slice(1).map((region) => (
          <line
            key={`line-${region.id}`}
            x1={selectedRegion.x}
            y1={selectedRegion.y}
            x2={region.x}
            y2={region.y}
            className="region-link"
          />
        ))}
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
            bottom: `${lever.impact}%`,
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

function WorldPulse() {
  return (
    <div className="world-pulse">
      {globalSignals.map((signal, index) => (
        <article key={signal.label} className="world-card" style={{ "--delay": `${index * 0.12}s` }}>
          <span>{signal.label}</span>
          <strong>{signal.lowCarbon}%</strong>
          <small>bas-carbone</small>
          <div className="world-meter">
            <i style={{ width: `${signal.fossil}%` }} />
          </div>
          <em>risque {signal.risk}</em>
        </article>
      ))}
    </div>
  );
}

function ComparativeBars() {
  return (
    <div className="comparative-bars">
      {globalSignals.map((signal) => (
        <div key={signal.label} className="compare-row">
          <span>{signal.label}</span>
          <div className="compare-track">
            <i className="fossil" style={{ width: `${signal.fossil}%` }} />
            <i className="low" style={{ width: `${signal.lowCarbon}%` }} />
          </div>
          <strong>{signal.lowCarbon}%</strong>
        </div>
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
