/**
 * Configuration for live data layers fetched from the backend API.
 * Each layer maps to a backend endpoint and defines rendering properties.
 */

export type DataLayerGroup =
  | "Reference"
  | "Transport"
  | "Economic"
  | "Social"
  | "Security"
  | "Environment"
  | "Trade"
  | "Satellite";

export type DataLayerConfig = {
  id: string;
  label: string;
  group: DataLayerGroup;
  endpoint: string;
  geometryType: "point" | "line" | "polygon" | "mixed" | "raster" | "arc";
  color: [number, number, number];
  /** Optional sub-color mapping for a property key */
  colorBy?: {
    property: string;
    map: Record<string, [number, number, number]>;
    fallback: [number, number, number];
  };
  legendLabel?: string;
  /** If true, layer is active by default on first load */
  defaultOn?: boolean;
};

export const DATA_LAYER_GROUPS: { key: DataLayerGroup; label: string }[] = [
  { key: "Reference", label: "Reference" },
  { key: "Transport", label: "Transport" },
  { key: "Economic", label: "Economic" },
  { key: "Trade", label: "Trade Flows" },
  { key: "Environment", label: "Environment" },
  { key: "Satellite", label: "Satellite / Raster" },
  { key: "Social", label: "Social" },
  { key: "Security", label: "Security" },
];

export const DATA_LAYERS: DataLayerConfig[] = [
  // ── Reference / Context ───────────────────────────────────────────────────
  {
    id: "projects",
    label: "Corridor Projects",
    group: "Reference",
    endpoint: "/api/projects-enriched/geojson",
    geometryType: "point",
    color: [59, 130, 246],
    defaultOn: true,
    colorBy: {
      property: "sector",
      map: {
        Transport: [59, 130, 246],
        "Urban Transport": [99, 102, 241],
        Logistics: [234, 88, 12],
        "Ports/Waterways": [37, 99, 235],
        Energy: [250, 204, 21],
        "Energy Transmission And Distribution": [250, 204, 21],
        "Other Energy And Extractives": [234, 179, 8],
        "Renewable Energy": [34, 197, 94],
        "Agro-Industry": [22, 163, 74],
        Trade: [168, 85, 247],
        Digital: [6, 182, 212],
        "Water Supply": [56, 189, 248],
        "Social Protection": [244, 114, 182],
      },
      fallback: [148, 163, 184],
    },
  },
  {
    id: "boundaries",
    label: "Country Boundaries",
    group: "Reference",
    endpoint: "/api/geo/boundaries",
    geometryType: "polygon",
    color: [148, 163, 184],
  },
  {
    id: "cities",
    label: "Major Cities",
    group: "Reference",
    endpoint: "/api/geo/cities",
    geometryType: "point",
    color: [255, 255, 255],
  },
  {
    id: "rivers",
    label: "Rivers",
    group: "Reference",
    endpoint: "/api/natural-features?type=rivers",
    geometryType: "line",
    color: [56, 189, 248],
  },
  {
    id: "lakes",
    label: "Lakes",
    group: "Reference",
    endpoint: "/api/natural-features?type=lakes",
    geometryType: "polygon",
    color: [59, 130, 246],
  },
  // ── Transport ──────────────────────────────────────────────────────────────
  {
    id: "roads_major",
    label: "Major Roads",
    group: "Transport",
    endpoint: "/api/roads?highway=motorway,trunk",
    geometryType: "line",
    color: [220, 38, 38],
  },
  {
    id: "roads_primary",
    label: "Primary Roads",
    group: "Transport",
    endpoint: "/api/roads?highway=primary",
    geometryType: "line",
    color: [234, 88, 12],
  },
  {
    id: "roads_secondary",
    label: "Secondary Roads",
    group: "Transport",
    endpoint: "/api/roads?highway=secondary",
    geometryType: "line",
    color: [202, 138, 4],
  },
  {
    id: "roads_tertiary",
    label: "Tertiary Roads",
    group: "Transport",
    endpoint: "/api/roads?highway=tertiary",
    geometryType: "line",
    color: [163, 163, 163],
  },
  {
    id: "railways",
    label: "Railways",
    group: "Transport",
    endpoint: "/api/infrastructure",
    geometryType: "line",
    color: [100, 60, 20],
  },
  {
    id: "ports",
    label: "Ports",
    group: "Transport",
    endpoint: "/api/infrastructure",
    geometryType: "point",
    color: [37, 99, 235],
  },
  {
    id: "airports",
    label: "Airports",
    group: "Transport",
    endpoint: "/api/infrastructure",
    geometryType: "point",
    color: [124, 58, 237],
  },
  {
    id: "border_crossings",
    label: "Border Crossings",
    group: "Transport",
    endpoint: "/api/infrastructure",
    geometryType: "point",
    color: [234, 88, 12],
  },
  // ── Economic ───────────────────────────────────────────────────────────────
  {
    id: "industrial",
    label: "Industrial Zones",
    group: "Economic",
    endpoint: "/api/infrastructure",
    geometryType: "polygon",
    color: [202, 138, 4],
  },
  {
    id: "sez_ftz",
    label: "SEZ / FTZ",
    group: "Economic",
    endpoint: "/api/infrastructure",
    geometryType: "polygon",
    color: [22, 163, 74],
  },
  {
    id: "minerals",
    label: "Minerals",
    group: "Economic",
    endpoint: "/api/minerals",
    geometryType: "point",
    color: [168, 85, 247],
  },
  {
    id: "power_plants",
    label: "Power Plants",
    group: "Economic",
    endpoint: "/api/energy/plants",
    geometryType: "point",
    color: [234, 179, 8],
    colorBy: {
      property: "fuel_category",
      map: {
        solar: [250, 204, 21],
        wind: [56, 189, 248],
        hydro: [59, 130, 246],
        gas: [249, 115, 22],
        oil: [120, 53, 15],
        coal: [75, 85, 99],
        biomass: [34, 197, 94],
      },
      fallback: [234, 179, 8],
    },
  },
  {
    id: "power_grid",
    label: "Power Grid",
    group: "Economic",
    endpoint: "/api/energy/grid",
    geometryType: "line",
    color: [250, 204, 21],
  },
  // ── Social ─────────────────────────────────────────────────────────────────
  {
    id: "health",
    label: "Health Facilities",
    group: "Social",
    endpoint: "/api/social?type=health",
    geometryType: "point",
    color: [239, 68, 68],
  },
  {
    id: "education",
    label: "Education",
    group: "Social",
    endpoint: "/api/social?type=education",
    geometryType: "point",
    color: [59, 130, 246],
  },
  {
    id: "financial",
    label: "Financial Services",
    group: "Social",
    endpoint: "/api/social?type=financial",
    geometryType: "point",
    color: [22, 163, 74],
  },
  {
    id: "government",
    label: "Government",
    group: "Social",
    endpoint: "/api/social?type=government",
    geometryType: "point",
    color: [100, 116, 139],
  },
  {
    id: "religious",
    label: "Religious",
    group: "Social",
    endpoint: "/api/social?type=religious",
    geometryType: "point",
    color: [168, 85, 247],
  },
  {
    id: "military",
    label: "Military",
    group: "Social",
    endpoint: "/api/social?type=military",
    geometryType: "point",
    color: [75, 85, 99],
  },
  {
    id: "recreational",
    label: "Recreation & Tourism",
    group: "Social",
    endpoint: "/api/social?type=recreational",
    geometryType: "point",
    color: [6, 182, 212],
  },
  {
    id: "pois",
    label: "Points of Interest",
    group: "Social",
    endpoint: "/api/social?type=pois",
    geometryType: "point",
    color: [244, 114, 182],
  },
  {
    id: "connectivity",
    label: "Internet Coverage",
    group: "Social",
    endpoint: "/api/indicators/connectivity?type=mobile",
    geometryType: "polygon",
    color: [16, 185, 129],
  },
  // ── Trade Flows (arc layers) ─────────────────────────────────────────────
  {
    id: "trade_cocoa",
    label: "Cocoa (CIV)",
    group: "Trade",
    endpoint: "/api/trade/arcs?country=CIV&commodity=cocoa",
    geometryType: "arc",
    color: [139, 69, 19],
  },
  {
    id: "trade_oil",
    label: "Oil (NGA)",
    group: "Trade",
    endpoint: "/api/trade/arcs?country=NGA&commodity=oil",
    geometryType: "arc",
    color: [30, 30, 30],
  },
  {
    id: "trade_gold",
    label: "Gold (GHA)",
    group: "Trade",
    endpoint: "/api/trade/arcs?country=GHA&commodity=gold",
    geometryType: "arc",
    color: [234, 179, 8],
  },
  {
    id: "trade_bauxite",
    label: "Bauxite (GHA)",
    group: "Trade",
    endpoint: "/api/trade/arcs?country=GHA&commodity=bauxite",
    geometryType: "arc",
    color: [180, 83, 9],
  },
  {
    id: "trade_cashew",
    label: "Cashew (CIV)",
    group: "Trade",
    endpoint: "/api/trade/arcs?country=CIV&commodity=cashew",
    geometryType: "arc",
    color: [161, 98, 7],
  },
  {
    id: "trade_cotton",
    label: "Cotton (BEN)",
    group: "Trade",
    endpoint: "/api/trade/arcs?country=BEN&commodity=cotton",
    geometryType: "arc",
    color: [229, 231, 235],
  },
  {
    id: "trade_palm_oil",
    label: "Palm Oil (NGA)",
    group: "Trade",
    endpoint: "/api/trade/arcs?country=NGA&commodity=palm_oil",
    geometryType: "arc",
    color: [234, 88, 12],
  },
  {
    id: "trade_rubber",
    label: "Rubber (CIV)",
    group: "Trade",
    endpoint: "/api/trade/arcs?country=CIV&commodity=rubber",
    geometryType: "arc",
    color: [64, 64, 64],
  },
  {
    id: "trade_cement",
    label: "Cement (NGA)",
    group: "Trade",
    endpoint: "/api/trade/arcs?country=NGA&commodity=cement",
    geometryType: "arc",
    color: [156, 163, 175],
  },
  {
    id: "trade_timber",
    label: "Timber (GHA)",
    group: "Trade",
    endpoint: "/api/trade/arcs?country=GHA&commodity=timber",
    geometryType: "arc",
    color: [101, 67, 33],
  },
  {
    id: "trade_fish",
    label: "Fish (GHA)",
    group: "Trade",
    endpoint: "/api/trade/arcs?country=GHA&commodity=fish",
    geometryType: "arc",
    color: [56, 189, 248],
  },
  {
    id: "trade_phosphates",
    label: "Phosphates (TGO)",
    group: "Trade",
    endpoint: "/api/trade/arcs?country=TGO&commodity=phosphates",
    geometryType: "arc",
    color: [217, 119, 6],
  },
  {
    id: "trade_manganese",
    label: "Manganese (GHA)",
    group: "Trade",
    endpoint: "/api/trade/arcs?country=GHA&commodity=manganese",
    geometryType: "arc",
    color: [139, 92, 246],
  },
  {
    id: "trade_shea",
    label: "Shea (BEN)",
    group: "Trade",
    endpoint: "/api/trade/arcs?country=BEN&commodity=shea",
    geometryType: "arc",
    color: [245, 208, 140],
  },
  // ── Environment (vector) ──────────────────────────────────────────────────
  {
    id: "landcover",
    label: "Land Cover",
    group: "Environment",
    endpoint: "/api/corridor/landcover",
    geometryType: "raster",
    color: [34, 197, 94],
  },
  {
    id: "ndvi",
    label: "Vegetation (NDVI)",
    group: "Environment",
    endpoint: "/api/corridor/ndvi",
    geometryType: "raster",
    color: [22, 163, 74],
  },
  // ── Satellite / Raster (GEE layers) ───────────────────────────────────────
  {
    id: "nightlights",
    label: "Nighttime Lights",
    group: "Satellite",
    endpoint: "/api/corridor/nightlights",
    geometryType: "raster",
    color: [250, 204, 21],
  },
  {
    id: "population",
    label: "Population Density",
    group: "Satellite",
    endpoint: "/api/corridor/population",
    geometryType: "raster",
    color: [239, 68, 68],
  },
  {
    id: "elevation",
    label: "Elevation & Slope",
    group: "Satellite",
    endpoint: "/api/corridor/elevation",
    geometryType: "raster",
    color: [120, 113, 108],
  },
  {
    id: "forest",
    label: "Forest Change",
    group: "Satellite",
    endpoint: "/api/corridor/forest",
    geometryType: "raster",
    color: [21, 128, 61],
  },
  {
    id: "buildings",
    label: "Building Density",
    group: "Satellite",
    endpoint: "/api/corridor/buildings/density",
    geometryType: "raster",
    color: [249, 115, 22],
  },
  {
    id: "protected_areas",
    label: "Protected Areas",
    group: "Satellite",
    endpoint: "/api/corridor/protected-areas",
    geometryType: "raster",
    color: [34, 197, 94],
  },
  {
    id: "healthcare_access",
    label: "Healthcare Access",
    group: "Satellite",
    endpoint: "/api/corridor/healthcare-access",
    geometryType: "raster",
    color: [239, 68, 68],
  },
  {
    id: "economic_index",
    label: "Economic Activity",
    group: "Satellite",
    endpoint: "/api/corridor/economic-index",
    geometryType: "raster",
    color: [59, 130, 246],
  },
  // ── Security ───────────────────────────────────────────────────────────────
  {
    id: "conflict",
    label: "Conflict Events",
    group: "Security",
    endpoint: "/api/conflict",
    geometryType: "point",
    color: [220, 38, 38],
    colorBy: {
      property: "event_type",
      map: {
        Battles: [220, 38, 38],
        Protests: [250, 204, 21],
        Riots: [249, 115, 22],
        "Violence against civilians": [168, 85, 247],
        "Explosions/Remote violence": [239, 68, 68],
        "Strategic developments": [100, 116, 139],
      },
      fallback: [220, 38, 38],
    },
  },
];

/**
 * Layers that share the /api/infrastructure endpoint — we fetch once and split.
 */
export const INFRASTRUCTURE_LAYER_IDS = [
  "railways",
  "ports",
  "airports",
  "border_crossings",
  "industrial",
  "sez_ftz",
] as const;

/** Map each infrastructure sub-layer to its `infrastructure_type` value in the GeoJSON */
export const INFRA_TYPE_MAP: Record<string, string> = {
  railways: "railways",
  ports: "ports",
  airports: "airports",
  border_crossings: "border_crossings",
  industrial: "industrial",
  sez_ftz: "sez_ftz",
};
