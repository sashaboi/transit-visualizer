import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const EXISTING_GREY = "#9aa3ab";

const LAYERS = {
  existing: [
    "go-milton-casing",
    "go-milton",
    "go-lakeshore-casing",
    "go-lakeshore",
    "transitway-casing",
    "transitway",
    "lrt-casing",
    "lrt",
    "go-station-dots",
    "go-station-labels",
  ],
  dixie: ["dixie-glow", "dixie-casing", "dixie", "dixie-label"],
  erinmills: ["erinmills-glow", "erinmills-casing", "erinmills", "erinmills-label"],
  derry: ["derry-glow", "derry-casing", "derry", "derry-label"],
  eglinton: ["eglinton-glow", "eglinton-casing", "eglinton", "eglinton-label"],
};

const COLORS = {
  dixie: "#b45309",
  erinmills: "#a16207",
  derry: "#c2410c",
  eglinton: "#0f766e",
  boundary: "#13212b",
};

const FONT_BOLD = ["Noto Sans Bold"];
const FONT_REGULAR = ["Noto Sans Regular"];

const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/positron",
  center: [-79.6441, 43.589],
  zoom: 10.35,
  minZoom: 9,
  maxZoom: 15,
  pitch: 0,
  attributionControl: true,
});

map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function addCorridor(id, data, width, { dashed = false } = {}) {
  map.addSource(id, { type: "geojson", data });

  map.addLayer({
    id: `${id}-casing`,
    type: "line",
    source: id,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#ffffff",
      "line-width": width + 3,
      "line-opacity": 0.55,
    },
  });

  const paint = {
    "line-color": EXISTING_GREY,
    "line-width": width,
    "line-opacity": 0.7,
  };
  if (dashed) paint["line-dasharray"] = [1.2, 1.1];

  map.addLayer({
    id,
    type: "line",
    source: id,
    layout: { "line-cap": "round", "line-join": "round" },
    paint,
  });
}

function addProposedCorridor(id, data, color, label, popupHtml) {
  map.addSource(id, { type: "geojson", data });

  map.addLayer({
    id: `${id}-glow`,
    type: "line",
    source: id,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": color,
      "line-width": 18,
      "line-opacity": 0.28,
      "line-blur": 1.2,
    },
  });
  map.addLayer({
    id: `${id}-casing`,
    type: "line",
    source: id,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#ffffff",
      "line-width": 9,
      "line-opacity": 0.98,
    },
  });
  map.addLayer({
    id,
    type: "line",
    source: id,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": color,
      "line-width": 6,
      "line-opacity": 1,
      "line-dasharray": [1.6, 1.2],
    },
  });
  map.addLayer({
    id: `${id}-label`,
    type: "symbol",
    source: id,
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 280,
      "text-field": label,
      "text-font": FONT_BOLD,
      "text-size": 14,
      "text-letter-spacing": 0.04,
      "text-offset": [0, -1.05],
      "text-max-angle": 25,
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "text-padding": 2,
    },
    paint: {
      "text-color": color,
      "text-halo-color": "rgba(255,255,255,0.97)",
      "text-halo-width": 2.4,
    },
  });

  map.on("click", id, (e) => {
    new maplibregl.Popup({ offset: 12, closeButton: false })
      .setLngLat(e.lngLat)
      .setHTML(popupHtml)
      .addTo(map);
  });
  map.on("mouseenter", id, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", id, () => {
    map.getCanvas().style.cursor = "";
  });
}

map.on("load", async () => {
  const [
    boundary,
    milton,
    lakeshore,
    transitway,
    lrt,
    dixie,
    erinMills,
    derry,
    eglinton,
    goStations,
  ] = await Promise.all([
    loadJson("/data/boundary.geojson"),
    loadJson("/data/lines-milton-go.geojson"),
    loadJson("/data/lines-lakeshore-go.geojson"),
    loadJson("/data/lines-transitway.geojson"),
    loadJson("/data/lines-hurontario-lrt.geojson"),
    loadJson("/data/lines-dixie-proposed.geojson"),
    loadJson("/data/lines-erin-mills-proposed.geojson"),
    loadJson("/data/lines-derry-proposed.geojson"),
    loadJson("/data/lines-eglinton-proposed.geojson"),
    loadJson("/data/go-stations-clean.geojson"),
  ]);

  map.addSource("boundary", { type: "geojson", data: boundary });
  map.addLayer({
    id: "boundary-fill",
    type: "fill",
    source: "boundary",
    paint: {
      "fill-color": "#64748b",
      "fill-opacity": 0.04,
    },
  });
  map.addLayer({
    id: "boundary-line",
    type: "line",
    source: "boundary",
    paint: {
      "line-color": COLORS.boundary,
      "line-width": 1.2,
      "line-opacity": 0.35,
      "line-dasharray": [2, 1.5],
    },
  });

  // Existing network — muted grey context
  addCorridor("go-milton", milton, 3.5);
  addCorridor("go-lakeshore", lakeshore, 3.5);
  addCorridor("transitway", transitway, 4);
  addCorridor("lrt", lrt, 3.5, { dashed: true });

  map.addSource("go-stations", { type: "geojson", data: goStations });
  map.addLayer({
    id: "go-station-dots",
    type: "circle",
    source: "go-stations",
    paint: {
      "circle-radius": 3.5,
      "circle-color": "#ffffff",
      "circle-stroke-color": EXISTING_GREY,
      "circle-stroke-width": 1.4,
      "circle-opacity": 0.85,
    },
  });
  map.addLayer({
    id: "go-station-labels",
    type: "symbol",
    source: "go-stations",
    layout: {
      "text-field": ["get", "name"],
      "text-font": FONT_REGULAR,
      "text-size": 10,
      "text-offset": [0, 1.05],
      "text-anchor": "top",
      "text-optional": true,
    },
    paint: {
      "text-color": EXISTING_GREY,
      "text-halo-color": "rgba(255,255,255,0.9)",
      "text-halo-width": 1.2,
      "text-opacity": 0.75,
    },
  });

  // Proposed corridors — prominent
  addProposedCorridor(
    "dixie",
    dixie,
    COLORS.dixie,
    "Dixie LRT / BRT",
    `<strong>Dixie LRT / BRT</strong><div style="margin-top:4px;font-size:12px;color:#3d4f5c">Proposed rapid transit along Dixie Road.</div>`
  );
  addProposedCorridor(
    "erinmills",
    erinMills,
    COLORS.erinmills,
    "Erin Mills LRT / BRT",
    `<strong>Erin Mills LRT / BRT</strong><div style="margin-top:4px;font-size:12px;color:#3d4f5c">Proposed rapid transit along Erin Mills Parkway.</div>`
  );
  addProposedCorridor(
    "derry",
    derry,
    COLORS.derry,
    "Derry LRT / BRT",
    `<strong>Derry LRT / BRT</strong><div style="margin-top:4px;font-size:12px;color:#3d4f5c">Proposed · Malton GO to Winston Churchill along Derry Road.</div>`
  );
  addProposedCorridor(
    "eglinton",
    eglinton,
    COLORS.eglinton,
    "Eglinton LRT / BRT",
    `<strong>Eglinton LRT / BRT</strong><div style="margin-top:4px;font-size:12px;color:#3d4f5c">Proposed · 9th Line to Renforth along Eglinton.</div>`
  );

  const bounds = new maplibregl.LngLatBounds();
  for (const feature of boundary.features) {
    const geom = feature.geometry;
    const rings =
      geom.type === "Polygon"
        ? geom.coordinates
        : geom.coordinates.flat();
    for (const ring of rings) {
      for (const [lon, lat] of ring) bounds.extend([lon, lat]);
    }
  }
  map.fitBounds(bounds, {
    padding: { top: 48, bottom: 48, left: 36, right: 48 },
    duration: 1400,
    essential: true,
  });
});

document.querySelectorAll(".legend-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.layer;
    const next = !btn.classList.contains("is-active");
    btn.classList.toggle("is-active", next);
    btn.setAttribute("aria-pressed", String(next));
    const visibility = next ? "visible" : "none";
    for (const id of LAYERS[key] || []) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility);
    }
  });
});
