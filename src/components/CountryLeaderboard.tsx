import { useState, useMemo } from 'react';
import { useWorldStore } from '../store/worldStore';
import { countryName } from '../data/countries';

export type FilterMetric =
  | 'gdp_per_capita'
  | 'divergence'
  | 'military_spend'
  | 'education_spend'
  | 'healthcare_spend'
  | 'unemployment'
  | 'tax_rate';

const METRIC_CONFIG: Record<FilterMetric, { label: string; unit: string; icon: string; fmt: (v: number) => string }> = {
  gdp_per_capita:   { label: 'GDP per Capita', unit: 'USD', icon: '💰', fmt: v => `$${Math.round(v).toLocaleString()}` },
  divergence:       { label: 'Divergence Score', unit: 'pts', icon: '🚨', fmt: v => `${v.toFixed(1)} pts` },
  military_spend:   { label: 'Military Spend', unit: '% GDP', icon: '⚔️', fmt: v => `${v.toFixed(2)}%` },
  education_spend:  { label: 'Education Spend', unit: '% GDP', icon: '🎓', fmt: v => `${v.toFixed(2)}%` },
  healthcare_spend: { label: 'Healthcare Spend', unit: '% GDP', icon: '🏥', fmt: v => `${v.toFixed(2)}%` },
  unemployment:     { label: 'Unemployment', unit: '%', icon: '📈', fmt: v => `${v.toFixed(1)}%` },
  tax_rate:         { label: 'Tax Revenue', unit: '% GDP', icon: '🏛️', fmt: v => `${v.toFixed(1)}%` },
};

export default function CountryLeaderboard() {
  const { countryData, recentDivergences, selectCountry, selectedCountry } = useWorldStore();
  const [metric, setMetric] = useState<FilterMetric>('gdp_per_capita');
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  // Map divergence magnitudes per country code
  const divergenceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of recentDivergences) {
      const mag = Object.values(d.delta).reduce((s, v) => s + Math.abs(v), 0);
      map.set(d.country_code, (map.get(d.country_code) ?? 0) + mag);
    }
    return map;
  }, [recentDivergences]);

  // Combine country data into rankable rows
  const rows = useMemo(() => {
    const list = Object.entries(countryData).map(([code, state]) => {
      let val = 0;
      if (metric === 'divergence') {
        val = divergenceMap.get(code) ?? 0;
      } else {
        val = state.indicators[metric] ?? 0;
      }
      return {
        code,
        name: countryName(code),
        value: val,
        year: state.year,
      };
    });

    // Filter search
    const query = search.trim().toLowerCase();
    const filtered = query
      ? list.filter(r => r.name.toLowerCase().includes(query) || r.code.toLowerCase().includes(query))
      : list;

    // Sort
    return filtered.sort((a, b) => sortAsc ? a.value - b.value : b.value - a.value);
  }, [countryData, metric, divergenceMap, search, sortAsc]);

  const maxVal = useMemo(() => {
    if (!rows.length) return 1;
    return Math.max(...rows.map(r => r.value), 1);
  }, [rows]);

  const cfg = METRIC_CONFIG[metric];

  return (
    <div className="game-panel" style={{ padding: 18 }}>
      {/* Header & Metric Filter Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <div className="game-badge game-badge-yellow" style={{ marginBottom: 4 }}>
            WORLD LEADERBOARD & STAT FILTERS
          </div>
          <div className="game-font-heading" style={{ fontSize: 18, color: '#fff' }}>
            NATION RANKINGS BY METRIC
          </div>
        </div>
        <input
          type="text"
          placeholder="🔍 Search nation..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: 'var(--bg-hud-card)',
            border: '2px solid var(--game-border-ink)',
            borderRadius: 'var(--radius-game-sm)',
            color: '#fff',
            padding: '6px 12px',
            fontSize: 12,
            fontFamily: 'var(--font-heading)',
            outline: 'none',
            minWidth: 160,
          }}
        />
      </div>

      {/* Metric Filter Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {(Object.keys(METRIC_CONFIG) as FilterMetric[]).map(m => {
          const item = METRIC_CONFIG[m];
          const active = metric === m;
          return (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`game-button ${active ? 'game-button-cyan' : 'game-button-dark'}`}
              style={{ padding: '6px 12px', fontSize: 11, height: 32 }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sort Direction Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '0 4px' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>
          SHOWING {rows.length} COUNTRIES · RANKED BY {cfg.label.toUpperCase()}
        </span>
        <button
          onClick={() => setSortAsc(!sortAsc)}
          style={{
            background: 'none', border: 'none', color: 'var(--accent-yellow)',
            cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-heading)', fontWeight: 700,
          }}
        >
          {sortAsc ? '⬆ LOWEST FIRST' : '⬇ HIGHEST FIRST'}
        </button>
      </div>

      {/* Leaderboard Table / List */}
      <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
        {!rows.length ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            No matching countries found.
          </div>
        ) : (
          rows.map((r, index) => {
            const isSelected = selectedCountry === r.code;
            const pct = Math.min(100, Math.max(4, (r.value / maxVal) * 100));
            const rank = index + 1;
            const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

            return (
              <div
                key={r.code}
                onClick={() => selectCountry(r.code)}
                className="game-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 6,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--accent-yellow)' : undefined,
                  boxShadow: isSelected ? '0 0 10px rgba(255,230,0,0.3)' : undefined,
                }}
              >
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: 13,
                  minWidth: 32,
                  color: rank <= 3 ? 'var(--accent-yellow)' : 'var(--text-muted)',
                }}>
                  {rankBadge}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{r.name}</span>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 12, color: 'var(--accent-cyan)' }}>
                      {cfg.fmt(r.value)}
                    </span>
                  </div>
                  <div className="game-stat-bar-container" style={{ height: 6 }}>
                    <div
                      className="game-stat-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: rank <= 3 ? 'linear-gradient(90deg, #FFE600, #FF7700)' : 'linear-gradient(90deg, #00F0FF, #9D00FF)',
                      }}
                    />
                  </div>
                </div>

                <div className="game-badge" style={{ fontSize: 10, padding: '2px 6px' }}>
                  {r.code}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
