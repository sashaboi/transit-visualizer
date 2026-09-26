import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const EXISTING_GREY = "#9aa3ab";
const GO_BLUE = "#111e6b"; // GO Milton + Lakeshore West (from brand swatch)

const LAYERS = {
  go: [
    "go-milton-casing",
    "go-milton",
    "go-milton-label",
    "go-lakeshore-casing",
    "go-lakeshore",
    "go-lakeshore-label",
    "go-station-dots",
    "go-station-labels",
  ],
  transitway: ["transitway-casing", "transitway"],
  hurontario: ["lrt-casing", "lrt", "lrt-label"],
  dixie: ["dixie-glow", "dixie-casing", "dixie", "dixie-label"],
  erinmills: ["erinmills-glow", "erinmills-casing", "erinmills", "erinmills-label"],
  derry: ["derry-glow", "derry-casing", "derry", "derry-label"],
  eglinton: ["eglinton-glow", "eglinton-casing", "eglinton", "eglinton-label"],
  ecwe: ["ecwe-glow", "ecwe-casing", "ecwe", "ecwe-label"],
};

const TERMINI_LAYERS = ["termini-halo", "termini-dot", "termini-label"];
const TERMINI_CORRIDORS = ["dixie", "erinmills", "derry", "eglinton"];
const TERMINI_GO_NAMES = ["Dixie GO", "Clarkson GO", "Malton GO"];

const COLORS = {
  proposed: "#ffc700", // Dipika for Mayor brand gold (--gold)
  go: GO_BLUE,
  hurontario: "#c4746a", // soft muted red — distinct from grey, still behind yellow
  ecwe: "#0b7f8a", // Metrolinx-adjacent teal
  boundary: "#13212b",
};

const FONT_BOLD = ["Noto Sans Bold"];
const FONT_REGULAR = ["Noto Sans Regular"];

// Average of Eglinton (~39°) and Derry (~43°) geographic bearings, minus 90°
// so both corridors read roughly horizontal on screen.
const MAP_BEARING = -49;

const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/positron",
  center: [-79.6441, 43.589],
  zoom: 10.35,
  minZoom: 9,
  maxZoom: 15,
  pitch: 0,
  bearing: MAP_BEARING,
  attributionControl: true,
});

map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
map.dragRotate.enable();
map.touchZoomRotate.enableRotation();

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function addCorridor(id, data, width, { dashed = false, color = EXISTING_GREY, label = null } = {}) {
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
    "line-color": color,
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

  if (label) {
    map.addLayer({
      id: `${id}-label`,
      type: "symbol",
      source: id,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 260,
        "text-field": label,
        "text-font": FONT_BOLD,
        "text-size": 12,
        "text-letter-spacing": 0.02,
        "text-offset": [0, -0.95],
        "text-max-angle": 25,
        "text-allow-overlap": false,
        "text-padding": 2,
      },
      paint: {
        "text-color": color,
        "text-halo-color": "rgba(255,255,255,0.96)",
        "text-halo-width": 2,
      },
    });
  }
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

function addEcweCorridor(id, data, color, label, popupHtml) {
  map.addSource(id, { type: "geojson", data });

  map.addLayer({
    id: `${id}-glow`,
    type: "line",
    source: id,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": color,
      "line-width": 12,
      "line-opacity": 0.22,
      "line-blur": 1,
    },
  });
  map.addLayer({
    id: `${id}-casing`,
    type: "line",
    source: id,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#ffffff",
      "line-width": 7,
      "line-opacity": 0.95,
    },
  });
  map.addLayer({
    id,
    type: "line",
    source: id,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": color,
      "line-width": 4.5,
      "line-opacity": 0.95,
      "line-dasharray": [1.6, 1.2],
    },
  });

  // Point label at line midpoint — line symbols often collide/hide at citywide zoom
  const line = data.features?.[0]?.geometry?.coordinates || [];
  const mid = line[Math.floor(line.length / 2)] || line[0];
  map.addSource(`${id}-label-point`, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: mid
        ? [
            {
              type: "Feature",
              properties: { name: label },
              geometry: { type: "Point", coordinates: mid },
            },
          ]
        : [],
    },
  });
  map.addLayer({
    id: `${id}-label`,
    type: "symbol",
    source: `${id}-label-point`,
    layout: {
      "text-field": ["get", "name"],
      "text-font": FONT_BOLD,
      "text-size": 13,
      "text-max-width": 14,
      "text-letter-spacing": 0.01,
      "text-anchor": "bottom",
      "text-offset": [0, -0.55],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-optional": false,
    },
    paint: {
      "text-color": color,
      "text-halo-color": "#ffffff",
      "text-halo-width": 2.8,
      "text-halo-blur": 0.2,
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

function syncTerminiVisibility() {
  const active = TERMINI_CORRIDORS.filter((key) =>
    document.querySelector(`.legend-item[data-layer="${key}"]`)?.classList.contains("is-active")
  );
  const filter =
    active.length === 0
      ? ["==", ["get", "corridor"], "__none__"]
      : ["in", ["get", "corridor"], ["literal", active]];
  for (const id of TERMINI_LAYERS) {
    if (map.getLayer(id)) map.setFilter(id, filter);
  }
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
    termini,
    ecwe,
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
    loadJson("/data/corridor-termini.geojson"),
    loadJson("/data/lines-ecwe.geojson"),
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

  // Existing network — GO light blue; Transitway grey; Hazel McCallion Line soft red dashed
  addCorridor("go-milton", milton, 3.5, { color: COLORS.go, label: "GO Milton" });
  addCorridor("go-lakeshore", lakeshore, 3.5, { color: COLORS.go, label: "GO Lakeshore West" });
  addCorridor("transitway", transitway, 4);
  addCorridor("lrt", lrt, 3.5, {
    dashed: true,
    color: COLORS.hurontario,
    label: "Hazel McCallion Line",
  });

  map.addSource("go-stations", { type: "geojson", data: goStations });
  map.addLayer({
    id: "go-station-dots",
    type: "circle",
    source: "go-stations",
    paint: {
      "circle-radius": 3.5,
      "circle-color": "#ffffff",
      "circle-stroke-color": COLORS.go,
      "circle-stroke-width": 1.4,
      "circle-opacity": 0.9,
    },
  });
  map.addLayer({
    id: "go-station-labels",
    type: "symbol",
    source: "go-stations",
    filter: ["!", ["in", ["get", "name"], ["literal", TERMINI_GO_NAMES]]],
    layout: {
      "text-field": ["get", "name"],
      "text-font": FONT_REGULAR,
      "text-size": 10,
      "text-offset": [0, 1.05],
      "text-anchor": "top",
      "text-optional": true,
    },
    paint: {
      "text-color": COLORS.go,
      "text-halo-color": "rgba(255,255,255,0.9)",
      "text-halo-width": 1.2,
      "text-opacity": 0.85,
    },
  });

  // Proposed corridors — brand yellow, solid
  addProposedCorridor(
    "dixie",
    dixie,
    COLORS.proposed,
    "Dixie LRT / BRT",
    `<strong>Dixie LRT / BRT</strong><div style="margin-top:4px;font-size:12px;color:#3d4f5c">Proposed along Dixie Road from Derry Road to Dixie GO (on-road).</div>`
  );
  addProposedCorridor(
    "erinmills",
    erinMills,
    COLORS.proposed,
    "Erin Mills LRT / BRT",
    `<strong>Erin Mills LRT / BRT</strong><div style="margin-top:4px;font-size:12px;color:#3d4f5c">Proposed along Erin Mills Parkway and Southdown Road from Derry Road to Clarkson GO.</div>`
  );
  addProposedCorridor(
    "derry",
    derry,
    COLORS.proposed,
    "Derry LRT / BRT",
    `<strong>Derry LRT / BRT</strong><div style="margin-top:4px;font-size:12px;color:#3d4f5c">Proposed · Malton GO to Winston Churchill along Derry Road.</div>`
  );
  addProposedCorridor(
    "eglinton",
    eglinton,
    COLORS.proposed,
    "Eglinton LRT / BRT",
    `<strong>Eglinton LRT / BRT</strong><div style="margin-top:4px;font-size:12px;color:#3d4f5c">Proposed along Eglinton Avenue from Ridgeway Plaza to Renforth.</div>`
  );

  // Metrolinx ECWE — teal dashed spur east of Renforth
  addEcweCorridor(
    "ecwe",
    ecwe,
    COLORS.ecwe,
    "Eglinton Crosstown West Extension",
    `<strong>Eglinton Crosstown West Extension</strong><div style="margin-top:4px;font-size:12px;color:#3d4f5c">Metrolinx · under construction east of Renforth toward Mount Dennis. Map shows a short surface corridor proxy along Eglinton Avenue West.</div>`
  );

  // Significant corridor endpoints only (not every GO)
  map.addSource("corridor-termini", { type: "geojson", data: termini });
  map.addLayer({
    id: "termini-halo",
    type: "circle",
    source: "corridor-termini",
    paint: {
      "circle-radius": 11,
      "circle-color": COLORS.proposed,
      "circle-opacity": 0.4,
    },
  });
  map.addLayer({
    id: "termini-dot",
    type: "circle",
    source: "corridor-termini",
    paint: {
      "circle-radius": 6.5,
      "circle-color": "#ffffff",
      "circle-stroke-color": COLORS.boundary,
      "circle-stroke-width": 2.2,
      "circle-opacity": 1,
    },
  });
  map.addLayer({
    id: "termini-label",
    type: "symbol",
    source: "corridor-termini",
    layout: {
      "text-field": ["get", "name"],
      "text-font": FONT_BOLD,
      "text-size": 13,
      "text-letter-spacing": 0.01,
      "text-variable-anchor": ["top", "bottom", "left", "right"],
      "text-radial-offset": 1.15,
      "text-justify": "auto",
      "text-optional": false,
      "text-allow-overlap": true,
      "text-padding": 4,
    },
    paint: {
      "text-color": COLORS.boundary,
      "text-halo-color": "rgba(255,255,255,0.96)",
      "text-halo-width": 2.2,
    },
  });
  syncTerminiVisibility();

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
    bearing: MAP_BEARING,
    duration: 1400,
    essential: true,
  });
  map.setBearing(MAP_BEARING);
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
    if (TERMINI_CORRIDORS.includes(key)) syncTerminiVisibility();
  });
});
