import { TIMEZONE_TO_ISO3 } from '../data/timezones';
import { COUNTRY_CENTROIDS, countryName } from '../data/countries';

export interface VisitorContext {
  /** IANA zone, e.g. "Asia/Kolkata". */
  timeZone: string;
  /** ISO3 of the visitor's country, if the zone maps to one we can place. */
  iso3: string | null;
  /** Display name for that country. */
  country: string | null;
  /** Visitor's local hour, 0-23. */
  hour: number;
  /** Whether it is daytime where the visitor is. */
  isDay: boolean;
}

/**
 * Best-effort visitor context from the browser's own locale settings.
 *
 * Deliberately avoids navigator.geolocation (shows a permission prompt) and IP
 * geolocation (sends the visitor's address to a third party). The timezone is
 * already available, costs nothing, never leaves the page, and is accurate to
 * the country — which is all that is needed to pick an opening view and a theme.
 */
export function readVisitorContext(now: Date = new Date()): VisitorContext {
  let timeZone = 'UTC';
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    // Intl is always present in supported browsers; fall through to UTC.
  }

  const mapped = TIMEZONE_TO_ISO3[timeZone] ?? null;
  // Only claim a country we can actually fly to.
  const iso3 = mapped && COUNTRY_CENTROIDS[mapped] ? mapped : null;
  const hour = now.getHours();

  return {
    timeZone,
    iso3,
    country: iso3 ? countryName(iso3) : null,
    hour,
    isDay: hour >= 7 && hour < 19,
  };
}

/** "6:42 pm" in the visitor's own locale. */
export function formatLocalTime(now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(now);
  } catch {
    return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
}
