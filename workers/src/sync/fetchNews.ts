// Fetches the top 5 most relevant recent news headlines for a country
// using NewsAPI.org's /v2/everything endpoint.
//
// Free tier: 100 requests/day, results up to 1 month old.
// The monthly-sync workflow stays well within this limit by running
// sequentially with short pauses between countries.

export interface NewsHeadline {
  title: string;
  description: string | null;
  source: string;
  publishedAt: string;
  url: string;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: Array<{
    title: string;
    description: string | null;
    source: { name: string };
    publishedAt: string;
    url: string;
  }>;
}

const NEWSAPI_BASE = 'https://newsapi.org/v2/everything';

/**
 * Fetch top-5 economy/policy headlines for a country.
 * Returns an empty array (not an error) if the API key is missing or rate-limited
 * so the sync pipeline continues gracefully.
 */
export async function fetchCountryNews(
  countryName: string,
  apiKey: string
): Promise<NewsHeadline[]> {
  if (!apiKey) return [];

  const query = encodeURIComponent(`"${countryName}" economy policy government`);
  const url =
    `${NEWSAPI_BASE}?q=${query}` +
    `&sortBy=relevance` +
    `&pageSize=5` +
    `&language=en` +
    `&apiKey=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      // Log, don't swallow silently — an empty result is indistinguishable from
      // "no news exists", which previously hid an auth/plan failure entirely.
      console.warn(
        `[fetchNews] ${countryName}: HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`
      );
      return [];
    }

    const data = (await res.json()) as NewsAPIResponse;
    if (data.status !== 'ok' || !Array.isArray(data.articles)) {
      console.warn(`[fetchNews] ${countryName}: unexpected payload — ${JSON.stringify(data).slice(0, 300)}`);
      return [];
    }
    if (data.articles.length === 0) {
      console.warn(`[fetchNews] ${countryName}: 0 articles (totalResults=${data.totalResults})`);
    }

    return data.articles.map(a => ({
      title: a.title,
      description: a.description,
      source: a.source.name,
      publishedAt: a.publishedAt,
      url: a.url,
    }));
  } catch (err) {
    console.warn(`[fetchNews] ${countryName}: request threw — ${String(err)}`);
    return [];
  }
}

/** Format headlines into a compact text block for LLM consumption. */
export function formatHeadlines(headlines: NewsHeadline[]): string {
  if (!headlines.length) return 'No recent news available.';
  return headlines
    .map((h, i) =>
      `[${i + 1}] ${h.title} (${h.source}, ${h.publishedAt.slice(0, 10)})\n` +
      (h.description ? `    ${h.description}` : '')
    )
    .join('\n');
}
