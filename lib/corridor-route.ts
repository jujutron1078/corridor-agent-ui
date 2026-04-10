/**
 * Corridor highway alignment — 13 nodes from Abidjan to Lagos.
 * Coordinates are [longitude, latitude] (GeoJSON convention).
 */

export type CorridorNode = {
  name: string;
  coordinates: [number, number];
  country: string;
  type: "city" | "border" | "port";
};

export const CORRIDOR_NODES: CorridorNode[] = [
  { name: "Abidjan", coordinates: [-3.97, 5.36], country: "CIV", type: "city" },
  { name: "Elubo", coordinates: [-3.00, 5.27], country: "GHA", type: "border" },
  { name: "Axim", coordinates: [-2.17, 5.10], country: "GHA", type: "city" },
  { name: "Takoradi", coordinates: [-1.76, 4.93], country: "GHA", type: "port" },
  { name: "Cape Coast", coordinates: [-1.02, 5.10], country: "GHA", type: "city" },
  { name: "Accra", coordinates: [-0.19, 5.60], country: "GHA", type: "city" },
  { name: "Tema", coordinates: [0.00, 5.55], country: "GHA", type: "port" },
  { name: "Aflao", coordinates: [1.10, 6.13], country: "GHA", type: "border" },
  { name: "Lome", coordinates: [1.23, 6.17], country: "TGO", type: "city" },
  { name: "Hilacondji", coordinates: [1.62, 6.21], country: "TGO", type: "border" },
  { name: "Cotonou", coordinates: [2.42, 6.37], country: "BEN", type: "city" },
  { name: "Seme Border", coordinates: [2.63, 6.46], country: "BEN", type: "border" },
  { name: "Lagos", coordinates: [3.40, 6.45], country: "NGA", type: "city" },
];

/** GeoJSON LineString for the corridor route */
export const CORRIDOR_ROUTE_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { name: "Abidjan-Lagos Highway Corridor" },
      geometry: {
        type: "LineString" as const,
        coordinates: CORRIDOR_NODES.map((n) => n.coordinates),
      },
    },
  ],
};

export const CORRIDOR_LENGTH_KM = 1028;
export const CORRIDOR_ECONOMIC_VALUE = "$16B";
export const CORRIDOR_COUNTRIES = 5;
