import { useEffect, useRef, useCallback, useState } from 'react';
import {
  Viewer,
  Ion,
  GeoJsonDataSource,
  Color,
  Cartesian3,
  PolylineGlowMaterialProperty,
  ColorMaterialProperty,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  Entity,
  ConstantProperty,
  ArcType,
  EllipsoidTerrainProvider,
  ImageryLayer,
  SingleTileImageryProvider,
  Math as CesiumMath,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useWorldStore } from '../store/worldStore';
import type { ChoroplethMode, WorldEvent } from '../store/worldStore';
import { useRegionStore, SUPPORTED_DRILL_COUNTRIES } from '../store/regionStore';
import { NUMERIC_TO_ISO3, countryName, COUNTRY_CENTROIDS as CENTROIDS } from '../data/countries';
import type { FeatureCollection, Feature } from 'geojson';

const cesiumToken = import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined;
if (cesiumToken) Ion.defaultAccessToken = cesiumToken;



// Event arc colors by type
const ARC_COLORS: Record<string, Color> = {
  sanction:           Color.RED.withAlpha(0.85),
  trade_deal:         Color.GOLD.withAlpha(0.85),
  military_posture:   Color.ORANGE.withAlpha(0.85),
  diplomatic_protest: Color.YELLOW.withAlpha(0.85),
  alliance_formed:    Color.CYAN.withAlpha(0.85),
  alliance_broken:    Color.HOTPINK.withAlpha(0.85),
  conflict_risk:      Color.RED.withAlpha(0.95),
};

// ─── ISO 3166-1 numeric → alpha-3 lookup ─────────────────────────────────────
// Needed because world-atlas TopoJSON entities use numeric IDs (no ISO_A3).
// We enrich each entity after load so the rest of the code stays unchanged.

// entity.id (numeric string) → ISO3 — populated after GeoJSON load
const entityIso3Map = new Map<string, string>();

// ─── Admin-1 GeoJSON (cached at module level) ────────────────────────────────
// Natural Earth 50m admin-1 state/province boundaries via jsDelivr CDN
const ADMIN1_URL =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_1_states_provinces.geojson';

// Module-level cache: null = not started, 'loading' = in flight, FeatureCollection = loaded
let admin1Cache: null | 'loading' | FeatureCollection = null;
const admin1Waiters: Array<(fc: FeatureCollection) => void> = [];

function loadAdmin1(): Promise<FeatureCollection> {
  if (admin1Cache && admin1Cache !== 'loading') {
    return Promise.resolve(admin1Cache);
  }
  if (admin1Cache === 'loading') {
    return new Promise(resolve => admin1Waiters.push(resolve));
  }
  admin1Cache = 'loading';
  return fetch(ADMIN1_URL)
    .then(r => r.json())
    .then((fc: FeatureCollection) => {
      admin1Cache = fc;
      admin1Waiters.forEach(fn => fn(fc));
      admin1Waiters.length = 0;
      return fc;
    });
}

/** Filter admin-1 FeatureCollection to a single country by ISO3 code */
function filterAdmin1(fc: FeatureCollection, iso3: string): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: fc.features.filter((f: Feature) => {
      const p = f.properties ?? {};
      return p['adm0_a3'] === iso3 || p['adm0_iso'] === iso3;
    }),
  };
}

// Altitude threshold (metres) below which we switch to admin-1 view
const DRILL_ALTITUDE = 2_000_000;

// ─── Arc helpers ─────────────────────────────────────────────────────────────
function arcPositions(
  from: [number, number],
  to: [number, number],
  steps = 32,
  apexAlt = 600_000
): Cartesian3[] {
  const pts: Cartesian3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lon = from[0] + (to[0] - from[0]) * t;
    const lat = from[1] + (to[1] - from[1]) * t;
    const alt = Math.sin(Math.PI * t) * apexAlt;
    pts.push(Cartesian3.fromDegrees(lon, lat, alt));
  }
  return pts;
}

function drawArc(viewer: Viewer, event: WorldEvent, durationMs = 4000): void {
  if (!event.to_country) return;
  const from = CENTROIDS[event.from_country];
  const to   = CENTROIDS[event.to_country];
  if (!from || !to) return;

  const color = ARC_COLORS[event.event_type] ?? Color.WHITE.withAlpha(0.7);
  const width = event.event_type === 'conflict_risk' ? 3 : 2;

  const entity = viewer.entities.add({
    polyline: {
      positions: arcPositions(from, to),
      width,
      material: new PolylineGlowMaterialProperty({ glowPower: 0.25, color }),
      clampToGround: false,
    },
  });

  setTimeout(() => {
    try { viewer.entities.remove(entity); } catch { /* viewer may be destroyed */ }
  }, durationMs);
}

// ─── Choropleth helpers ───────────────────────────────────────────────────────
function choroplethColor(value: number | undefined, min: number, max: number): Color {
  // Fully transparent rather than dark grey: with no overlay selected the
  // illustrated Earth beneath should be visible, not covered by 200 grey plates.
  if (value === undefined) return Color.TRANSPARENT;
  if (max === min) return Color.fromCssColorString('#0f172a').withAlpha(0.85);
  // Log scale so mid-range countries get distinct colors (linear scale clusters everything near green)
  const logMin = Math.log1p(min);
  const logMax = Math.log1p(max);
  const t = Math.max(0, Math.min(1, (Math.log1p(value) - logMin) / (logMax - logMin)));
  return Color.fromHsl((1 - t) * 0.33, 0.80, 0.45, 0.92);
}

// ─── Tooltip overlay ─────────────────────────────────────────────────────────
interface TooltipState { iso3: string; x: number; y: number }

function Tooltip({ tip, mode, values }: {
  tip: TooltipState;
  mode: ChoroplethMode;
  values: Map<string, number>;
}) {
  const name = countryName(tip.iso3);
  const val  = values.get(tip.iso3);
  const modeLabel = CHOROPLETH_LABELS[mode];
  const valStr = val !== undefined
    ? mode === 'gdp_per_capita'
      ? `$${Math.round(val).toLocaleString()}`
      : `${val.toFixed(1)}%`
    : '—';

  return (
    <div style={{
      position:     'absolute',
      left:         tip.x + 14,
      top:          tip.y - 10,
      pointerEvents:'none',
      background:   'var(--surface-floating)',
      backdropFilter: 'var(--surface-floating-blur)',
      border:       'var(--border-strong)',
      borderRadius: 'var(--radius-panel)',
      padding:      '8px 12px',
      color:        '#fff',
      fontSize:     12,
      zIndex:       20,
      maxWidth:     200,
      boxShadow:    'var(--shadow-floating)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{name}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 4 }}>{tip.iso3}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ color: '#9ca3af' }}>{modeLabel.split(' (')[0]}</span>
        <span style={{ fontWeight: 600 }}>{valStr}</span>
      </div>
      <div style={{ color: 'var(--text-faint)', fontSize: 10, marginTop: 5 }}>Click to explore →</div>
    </div>
  );
}

// ─── Drill-down indicator ─────────────────────────────────────────────────────
function DrillBadge({ country }: { country: string }) {
  return (
    <div style={{
      position:      'absolute',
      bottom:        32,
      left:          '50%',
      transform:     'translateX(-50%)',
      background:    'rgba(99,102,241,0.15)',
      border:        '1px solid rgba(167,139,250,0.4)',
      borderRadius:  8,
      padding:       '5px 12px',
      fontSize:      11,
      color:         '#a78bfa',
      pointerEvents: 'none',
    }}>
      🔍 Region view — {countryName(country)} · Click a region to inspect
    </div>
  );
}

// ─── Main Globe component ─────────────────────────────────────────────────────
export default function Globe() {
  const containerRef   = useRef<HTMLDivElement>(null);
  const viewerRef      = useRef<Viewer | null>(null);
  const sourceRef      = useRef<GeoJsonDataSource | null>(null);
  const regionSrcRef   = useRef<GeoJsonDataSource | null>(null);
  const handlerRef     = useRef<ScreenSpaceEventHandler | null>(null);
  const lastEventIdRef = useRef<number>(-1);
  const hoverTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drillCountryRef = useRef<string | null>(null);

  const {
    choroplethValues, choroplethMode, loadChoropleth,
    selectedCountry, worldEvents, pulseCountry, setPulseCountry, setGlobeReady,
  } = useWorldStore();

  useRegionStore(); // subscribe so RegionPanel re-renders when selection changes
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [drillCountry, setDrillCountry] = useState<string | null>(null);
  // Cesium boots and then pulls ~110m country geometry from a CDN, which takes
  // 15-25s cold. Without this the app is an unexplained black screen for that
  // whole window and reads as broken.
  const [globeStatus, setGlobeStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Mirror readiness into the store, and reset on unmount so a remount (e.g.
  // navigating between the globe and the dashboard) starts from 'loading' again.
  useEffect(() => {
    setGlobeReady(globeStatus === 'ready');
  }, [globeStatus, setGlobeReady]);
  useEffect(() => () => setGlobeReady(false), [setGlobeReady]);

  // ── Apply choropleth colors ──────────────────────────────────────────────
  const applyColors = useCallback(() => {
    const source = sourceRef.current;
    if (!source) return;
    const vals = Array.from(choroplethValues.values());
    const min  = Math.min(...vals);
    const max  = Math.max(...vals);
    for (const entity of source.entities.values) {
      const iso3 = entityIso3Map.get(entity.id);
      const val  = iso3 ? choroplethValues.get(iso3) : undefined;
      const col  = choroplethColor(val, min, max);
      if (entity.polygon) {
        entity.polygon.material = new ColorMaterialProperty(col);
      }
    }
  }, [choroplethValues]);

  useEffect(() => { loadChoropleth(); }, []);
  useEffect(() => { applyColors(); }, [choroplethValues]);

  // ── Camera fly-to when a country is selected ─────────────────────────────
  // Fixed altitude, deliberately: viewer.flyTo(entity) frames the polygon tightly
  // and for most countries ends up below DRILL_ALTITUDE, which silently trips the
  // admin-1 region view and leaves the user staring at a blank globe while 2MB of
  // province geometry downloads. COUNTRY_CENTROIDS now covers every mapped
  // country, so a plain centroid flight works for all of them.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!selectedCountry || !viewer) return;
    const centroid = CENTROIDS[selectedCountry];
    if (!centroid) return;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(centroid[0], centroid[1], 3_200_000),
      // Look straight down. Without an explicit orientation the camera keeps
      // whatever heading/pitch it had, which after a long flight can leave it
      // pointing away from the globe — the user lands on empty starfield.
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-90), roll: 0 },
      duration: 1.5,
    });
  }, [selectedCountry]);

  // ── Country pulse on player policy save ──────────────────────────────────
  useEffect(() => {
    if (!pulseCountry || !sourceRef.current) return;
    const source = sourceRef.current;
    const vals   = Array.from(choroplethValues.values());
    const min    = Math.min(...vals);
    const max    = Math.max(...vals);

    for (const entity of source.entities.values) {
      const iso3 = entityIso3Map.get(entity.id);
      if (iso3 !== pulseCountry || !entity.polygon) continue;
      entity.polygon.material = new ColorMaterialProperty(Color.WHITE.withAlpha(0.95));
      const restoreColor = choroplethColor(choroplethValues.get(iso3), min, max);
      setTimeout(() => {
        if (entity.polygon) {
          entity.polygon.material = new ColorMaterialProperty(restoreColor);
        }
        setPulseCountry(null);
      }, 550);
      break;
    }
  }, [pulseCountry]);

  // ── Draw event arcs for newly-arrived world events ────────────────────────
  useEffect(() => {
    if (!viewerRef.current || !worldEvents.length) return;
    if (lastEventIdRef.current === -1) {
      lastEventIdRef.current = Math.max(...worldEvents.map(e => e.id));
      return;
    }
    const newEvents = worldEvents.filter(e => e.id > lastEventIdRef.current && e.to_country);
    for (const ev of newEvents.slice(0, 12)) drawArc(viewerRef.current, ev);
    if (newEvents.length) lastEventIdRef.current = Math.max(...newEvents.map(e => e.id));
  }, [worldEvents]);

  // ── Load / unload admin-1 regions based on altitude + selected country ────
  const loadRegions = useCallback(async (viewer: Viewer, iso3: string) => {
    // Remove previous region source
    if (regionSrcRef.current) {
      viewer.dataSources.remove(regionSrcRef.current, true);
      regionSrcRef.current = null;
    }
    drillCountryRef.current = iso3;
    setDrillCountry(iso3);

    try {
      const fc      = await loadAdmin1();
      const filtered = filterAdmin1(fc, iso3);
      if (filtered.features.length === 0) return;

      // Check we're still zoomed in (user may have zoomed out while loading)
      if (drillCountryRef.current !== iso3) return;

      const src = await GeoJsonDataSource.load(filtered, {
        stroke:      Color.WHITE.withAlpha(0.6),
        fill:        Color.fromCssColorString('#6366f1').withAlpha(0.15),
        strokeWidth: 1.5,
      });
      viewer.dataSources.add(src);
      regionSrcRef.current = src;
    } catch {
      // Admin-1 fetch failed — silently degrade
    }
  }, []);

  const unloadRegions = useCallback((viewer: Viewer) => {
    if (regionSrcRef.current) {
      viewer.dataSources.remove(regionSrcRef.current, true);
      regionSrcRef.current = null;
    }
    drillCountryRef.current = null;
    setDrillCountry(null);
  }, []);

  // ── Cesium viewer initialisation ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = new Viewer(containerRef.current, {
      animation:             false,
      baseLayerPicker:       false,
      fullscreenButton:      false,
      geocoder:              false,
      homeButton:            false,
      infoBox:               false,
      navigationHelpButton:  false,
      sceneModePicker:       false,
      selectionIndicator:    false,
      timeline:              false,
      creditContainer:       document.createElement('div'),
      // Flat ellipsoid — prevents terrain tiles from depth-occluding polygon fills
      terrainProvider:       new EllipsoidTerrainProvider(),
      // Illustrated Earth as the base layer. A single equirectangular PNG needs
      // no tile server and no Cesium Ion token, and being opaque it also removes
      // the failed-Ion-imagery case that left the globe rendering as bare space.
      baseLayer: new ImageryLayer(
        new SingleTileImageryProvider({
          url: `${import.meta.env.BASE_URL}earth-cartoon.png`,
          tileWidth: 4096,
          tileHeight: 2048,
        }),
      ),
    });

    // Real sun position, so the visitor's own daylight is reflected on the globe
    // as a day/night terminator across the imagery.
    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.baseColor = Color.fromCssColorString('#0b1b2b');

    // Disable atmosphere scattering. Cesium's computeAtmosphereScattering shader
    // fails to compile under ANGLE's Metal backend on Apple Silicon — ANGLE
    // emits invalid MSL (a __metal_generic reference that will not bind), the
    // vertex program fails to link, and the globe surface never draws (a black
    // sphere). enableLighting selects the dynamic-atmosphere-lighting shader
    // permutation, so leaving these on is what triggered it. The day/night
    // terminator above does not depend on the atmosphere, so turning it off
    // costs only the blue limb haze.
    viewer.scene.globe.showGroundAtmosphere = false;
    if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = false;
    viewerRef.current = viewer;

    // Dev-only handle. The globe's render state is otherwise unreachable from
    // outside React, which makes camera and imagery problems hard to diagnose.
    if (import.meta.env.DEV) {
      (window as unknown as { __viewer?: Viewer }).__viewer = viewer;
    }


    // world-atlas TopoJSON: simplified geometry + numeric ISO IDs.
    // GeoJsonDataSource hardcodes arcType=RHUMB which overflows on large polygons (CesiumJS 1.141).
    // Fix: switch fill to GEODESIC + disable outline entirely before adding to the scene.
    // ISO_A3 is added via numeric lookup so choropleth/click code stays unchanged.
    GeoJsonDataSource.load(
      'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
      { stroke: Color.WHITE.withAlpha(0.2), fill: Color.fromCssColorString('#1e293b').withAlpha(0.75), strokeWidth: 0.5 }
    ).then(source => {
      if (viewerRef.current?.isDestroyed()) return;
      entityIso3Map.clear();
      for (const entity of source.entities.values) {
        const iso3 = NUMERIC_TO_ISO3[entity.id];
        if (iso3) entityIso3Map.set(entity.id, iso3);
        if (entity.polygon) {
          entity.polygon.arcType = new ConstantProperty(ArcType.GEODESIC);
          entity.polygon.outline = new ConstantProperty(false);
        }
      }
      viewerRef.current!.dataSources.add(source);
      sourceRef.current = source;
      applyColors();

      // The fetch resolving is not the same as the globe being painted, so wait
      // for a couple of rendered frames before clearing the loading state.
      //
      // Deliberately NOT gated on viewer.dataSourceDisplay.ready: that property
      // is updated during rendering, so in any environment where frames are not
      // ticking (a hidden tab, a throttled automation pane) it stays false
      // forever and the spinner never clears. The short timeout is the backstop.
      const viewer = viewerRef.current!;
      let frames = 0;
      const onFrame = () => {
        if (viewer.isDestroyed()) return;
        if (++frames >= 2) {
          viewer.scene.postRender.removeEventListener(onFrame);
          setGlobeStatus('ready');
        }
      };
      viewer.scene.postRender.addEventListener(onFrame);
      window.setTimeout(() => {
        if (!viewer.isDestroyed()) {
          viewer.scene.postRender.removeEventListener(onFrame);
          setGlobeStatus('ready');
        }
      }, 5000);
    }).catch(err => {
      console.error('[Globe] GeoJSON load failed:', err);
      setGlobeStatus('error');
    });

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handlerRef.current = handler;

    // Click handler — country OR region
    handler.setInputAction((evt: { position: import('cesium').Cartesian2 }) => {
      const picked = viewer.scene.pick(evt.position);
      if (!defined(picked) || !(picked.id instanceof Entity)) {
        useWorldStore.getState().selectCountry(null);
        useRegionStore.getState().selectRegion(null);
        return;
      }
      const entity = picked.id as Entity;
      const props  = entity.properties as Record<string, { getValue: () => string }> | undefined;

      // Check if this is a region entity (admin-1 has 'name' + 'adm0_a3')
      const regionName    = props?.['name']?.getValue();
      const regionIso32   = props?.['adm0_a3']?.getValue() ?? props?.['adm0_iso']?.getValue();
      const regionCode    = props?.['iso_3166_2']?.getValue()
                         ?? props?.['postal']?.getValue()
                         ?? props?.['name']?.getValue();

      if (regionSrcRef.current && regionName && regionIso32) {
        // This is an admin-1 region click
        useRegionStore.getState().selectRegion({
          code:        regionCode ?? regionName,
          name:        regionName,
          countryCode: regionIso32,
        });
        setTooltip(null);
        return;
      }

      // Otherwise treat as country click
      const iso3 = entityIso3Map.get(entity.id) ?? props?.['ISO_A3']?.getValue() ?? props?.['iso_a3']?.getValue();
      if (iso3) {
        useWorldStore.getState().selectCountry(iso3);
        useRegionStore.getState().selectRegion(null);
      }
      setTooltip(null);
    }, ScreenSpaceEventType.LEFT_CLICK);

    // Mouse move → hover tooltip
    handler.setInputAction((evt: { endPosition: import('cesium').Cartesian2 }) => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      const picked = viewer.scene.pick(evt.endPosition);
      if (!defined(picked) || !(picked.id instanceof Entity)) { setTooltip(null); return; }
      const entity = picked.id as Entity;
      const props  = entity.properties as Record<string, { getValue: () => string }> | undefined;
      const iso3   = entityIso3Map.get(entity.id) ?? props?.['ISO_A3']?.getValue() ?? props?.['iso_a3']?.getValue();
      if (!iso3) { setTooltip(null); return; }
      const x = evt.endPosition.x;
      const y = evt.endPosition.y;
      hoverTimerRef.current = setTimeout(() => setTooltip({ iso3, x, y }), 300);
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // Camera move → detect altitude + selected country for drill-down
    viewer.camera.changed.addEventListener(() => {
      if (!viewerRef.current) return;
      const altitude  = viewerRef.current.camera.positionCartographic.height;
      const selected  = useWorldStore.getState().selectedCountry;
      const isDrillable = selected && SUPPORTED_DRILL_COUNTRIES.has(selected);
      const currentDrill = drillCountryRef.current;

      if (altitude < DRILL_ALTITUDE && isDrillable) {
        if (currentDrill !== selected) {
          loadRegions(viewerRef.current, selected!);
        }
      } else if (altitude >= DRILL_ALTITUDE && currentDrill) {
        unloadRegions(viewerRef.current);
      }
    });

    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      handlerRef.current?.destroy();
      viewerRef.current?.destroy();
      viewerRef.current = null;
      sourceRef.current = null;
      regionSrcRef.current = null;
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#000' }} />
      {globeStatus !== 'loading' && <ChoroplethLegend mode={choroplethMode} />}
      {globeStatus !== 'ready' && <GlobeStatus status={globeStatus} />}
      {tooltip && (
        <Tooltip tip={tooltip} mode={choroplethMode} values={choroplethValues} />
      )}
      {drillCountry && <DrillBadge country={drillCountry} />}
    </div>
  );
}

// ─── Globe loading / error state ──────────────────────────────────────────────
function GlobeStatus({ status }: { status: 'loading' | 'error' }) {
  const failed = status === 'error';
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14,
        pointerEvents: 'none', textAlign: 'center', padding: 24,
      }}
    >
      {!failed && (
        <div
          style={{
            width: 46, height: 46, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.12)',
            borderTopColor: '#818cf8',
            animation: 'rs-spin 900ms linear infinite',
          }}
        />
      )}
      <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>
        {failed ? 'Could not load country boundaries' : 'Building the world…'}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, maxWidth: 300, lineHeight: 1.5 }}>
        {failed
          ? 'The country geometry CDN did not respond. Check your connection and reload.'
          : 'Loading boundaries for 210 countries. First load takes a few seconds.'}
      </div>
      <style>{'@keyframes rs-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

// ─── Choropleth legend ────────────────────────────────────────────────────────
const CHOROPLETH_LABELS: Record<ChoroplethMode, string> = {
  none:             'None — show the Earth',
  gdp_per_capita:   'GDP per Capita (USD)',
  military_spend:   'Military Spend (% GDP)',
  unemployment:     'Unemployment (%)',
  education_spend:  'Education Spend (% GDP)',
  healthcare_spend: 'Healthcare Spend (% GDP)',
  divergence:       'Divergence from Reality',
};

function ChoroplethLegend({ mode }: { mode: ChoroplethMode }) {
  const { setChoroplethMode } = useWorldStore();
  return (
    <div style={{
      position:        'absolute',
      bottom:          32,
      left:            16,
      background:      'var(--surface-floating)',
      backdropFilter:  'var(--surface-floating-blur)',
      borderRadius:    'var(--radius-panel)',
      padding:         '12px 16px',
      color:           '#fff',
      fontSize:        12,
      display:         'flex',
      flexDirection:   'column',
      gap:             7,
      minWidth:        195,
      border:          'var(--border-subtle)',
      boxShadow:       'var(--shadow-floating)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#9ca3af' }}>
        Overlay
      </div>
      {(Object.keys(CHOROPLETH_LABELS) as ChoroplethMode[]).map(m => (
        // minHeight 24 meets the WCAG 2.5.8 minimum target size; the bare 13px
        // radio was well under it. The label is the hit area, so sizing it is enough.
        <label key={m} style={{ cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', minHeight: 24 }}>
          <input
            type="radio"
            name="choropleth-overlay"
            checked={mode === m}
            onChange={() => setChoroplethMode(m)}
            style={{ accentColor: '#6366f1', width: 16, height: 16, margin: 0, flexShrink: 0 }}
          />
          <span style={{ color: mode === m ? '#fff' : '#9ca3af' }}>{CHOROPLETH_LABELS[m]}</span>
        </label>
      ))}
      <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
        <span style={{ background: 'hsl(120,80%,45%)', width: 12, height: 12, borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
        Low
        <span style={{ flex: 1, height: 4, background: 'linear-gradient(to right,hsl(120,80%,45%),hsl(60,80%,45%),hsl(0,80%,45%))', borderRadius: 2 }} />
        High
        <span style={{ background: 'hsl(0,80%,45%)', width: 12, height: 12, borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
      </div>
    </div>
  );
}
