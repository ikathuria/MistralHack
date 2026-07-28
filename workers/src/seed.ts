// One-shot seed: fetches World Bank indicators for all countries and upserts
// into country_states for world_id='live'. Exposed as POST /api/seed.
// Safe to re-run — upserts on (world_id, country_code, year).

import { getSupabase } from './lib/supabase.js';

const CURRENT_YEAR = new Date().getFullYear();

// World Bank indicator codes
const WB_INDICATORS = {
  gdp_per_capita:   'NY.GDP.PCAP.CD',   // current USD
  population:       'SP.POP.TOTL',
  tax_rate:         'GC.TAX.TOTL.GD.ZS', // % of GDP
  military_spend:   'MS.MIL.XPND.GD.ZS', // % of GDP
  education_spend:  'SE.XPD.TOTL.GD.ZS', // % of GDP
  healthcare_spend: 'SH.XPD.CHEX.GD.ZS', // % of GDP
  unemployment:     'SL.UEM.TOTL.ZS',    // % of labor force
} as const;

type IndicatorKey = keyof typeof WB_INDICATORS;

interface WBResponse {
  page:    number;
  pages:   number;
  total:   number;
  per_page: number;
}

interface WBDataPoint {
  countryiso3code: string;
  date: string;
  value: number | null;
  country: { id: string; value: string };
}

interface WBCountry {
  id: string;                          // ISO3 code
  iso2Code: string;
  name: string;
  region: { id: string; value: string }; // region.id === "NA" ⇒ aggregate, not a country
}

// The World Bank caps a response at `per_page` records and reports the total
// page count in the metadata envelope. `country/all` with mrv=5 returns ~1325
// records, so reading only the first 500-record page silently truncated the
// result to the first ~95 countries alphabetically (AFE..CYP) — dropping USA,
// IND, GBR, DEU, FRA, JPN and every other country after "C". The fix is to
// follow `pages`, not to request a bigger page: per_page above 500 makes the
// API time out on some indicators (GC.TAX.TOTL.GD.ZS reproducibly), so we keep
// the proven page size and paginate. 3 pages x 7 indicators + 1 country list
// = 22 subrequests, within the Workers per-invocation limit.
const WB_PER_PAGE = 500;
const WB_MAX_PAGES = 20; // safety valve — never loop unbounded on API weirdness

async function fetchIndicatorPage(
  code: string,
  page: number
): Promise<[WBResponse, WBDataPoint[]]> {
  const url =
    `https://api.worldbank.org/v2/country/all/indicator/${code}` +
    `?format=json&mrv=5&per_page=${WB_PER_PAGE}&page=${page}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`World Bank API error for ${code}: ${res.status}`);

  const body = (await res.json()) as [WBResponse, WBDataPoint[]];
  return body;
}

// Fetch the most recent non-null value per country for one indicator.
// mrv=5 looks back up to 5 years; we keep the highest year rather than trusting
// the API's row ordering.
//
// Page 1 tells us the total page count, so pages 2..N are fetched concurrently
// rather than in sequence — walking them serially across all 7 indicators
// exceeded 280s and timed out the request.
async function fetchIndicator(code: string): Promise<Map<string, number>> {
  const latest = new Map<string, { value: number; year: number }>();

  const absorb = (data: WBDataPoint[]): void => {
    if (!Array.isArray(data)) return;
    for (const point of data) {
      const iso3 = point.countryiso3code;
      if (!iso3 || point.value === null) continue;
      const year = Number.parseInt(point.date, 10);
      if (!Number.isFinite(year)) continue;
      const existing = latest.get(iso3);
      if (!existing || year > existing.year) {
        latest.set(iso3, { value: point.value, year });
      }
    }
  };

  const [meta, firstPage] = await fetchIndicatorPage(code, 1);
  absorb(firstPage);

  const totalPages = Math.min(meta?.pages ?? 1, WB_MAX_PAGES);
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        fetchIndicatorPage(code, i + 2).then(([, data]) => data)
      )
    );
    for (const data of rest) absorb(data);
  }

  return new Map(Array.from(latest, ([iso3, { value }]) => [iso3, value]));
}

// The /country endpoint distinguishes sovereign countries from the ~78
// aggregates the API also returns (WLD, EUU, ARB, AFE, AFW, CEB, ...):
// aggregates carry region.id === "NA". Filtering on the presence of GDP data
// does NOT work — aggregates have GDP too, which is why they leaked in before.
async function fetchRealCountryCodes(): Promise<Set<string>> {
  const url = 'https://api.worldbank.org/v2/country?format=json&per_page=400';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`World Bank country list error: ${res.status}`);

  const [, data] = (await res.json()) as [WBResponse, WBCountry[]];
  if (!Array.isArray(data)) return new Set();

  const codes = new Set<string>();
  for (const country of data) {
    if (country?.region?.id && country.region.id !== 'NA' && country.id) {
      codes.add(country.id);
    }
  }
  return codes;
}

export async function runSeed(supabaseUrl: string, serviceKey: string): Promise<{ seeded: number; errors: string[] }> {
  const db = getSupabase(supabaseUrl, serviceKey);
  const errors: string[] = [];

  // Sovereign-country allowlist, so World Bank aggregates never enter the world
  // state. If this lookup fails we skip the filter rather than seeding nothing.
  let realCountries: Set<string>;
  try {
    realCountries = await fetchRealCountryCodes();
  } catch (e) {
    errors.push(`Country list fetch failed, aggregates not filtered: ${String(e)}`);
    realCountries = new Set();
  }

  // Fetch all indicators in parallel
  const results = await Promise.allSettled(
    Object.entries(WB_INDICATORS).map(async ([key, code]) => ({
      key: key as IndicatorKey,
      data: await fetchIndicator(code),
    }))
  );

  // Merge into a single map: iso3 → indicators{}
  const byCountry = new Map<string, Record<string, number>>();
  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push(String(result.reason));
      continue;
    }
    const { key, data } = result.value;
    for (const [iso3, value] of data) {
      if (!byCountry.has(iso3)) byCountry.set(iso3, {});
      byCountry.get(iso3)![key] = value;
    }
  }

  // Keep sovereign countries that have a GDP-per-capita value (the choropleth's
  // primary metric). `realCountries` is empty only if the lookup above failed,
  // in which case we fall back to the shape test alone.
  const rows = Array.from(byCountry.entries())
    .filter(([iso3, ind]) =>
      /^[A-Z]{3}$/.test(iso3) &&
      (realCountries.size === 0 || realCountries.has(iso3)) &&
      ind.gdp_per_capita !== undefined
    )
    .map(([country_code, indicators]) => ({
      world_id: 'live',
      country_code,
      year: CURRENT_YEAR,
      indicators,
      policies: {},
      relations: {},
      last_updated: new Date().toISOString(),
    }));

  // Upsert in batches of 50
  const BATCH = 50;
  let seeded = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await db.from('country_states').upsert(batch, {
      onConflict: 'world_id,country_code,year',
    });
    if (error) {
      errors.push(`Batch ${i / BATCH}: ${error.message}`);
    } else {
      seeded += batch.length;
    }
  }

  return { seeded, errors };
}
