import axios from "axios";

/**
 * NASA's APOD API is mostly fast (~400ms) but intermittently stalls for 20-30s
 * before returning a 503. A sweep of 60 random dates through this endpoint hit
 * that ~7% of the time. With no timeout on the request, the stall outlived the
 * platform's function limit and Vercel killed us with a plain-text
 * FUNCTION_INVOCATION_TIMEOUT — which the client then tried to parse as JSON.
 *
 * The stall is random rather than date-specific: the same date that hung for
 * 28s answered in 0.43s on the next attempt. So a short timeout plus a retry
 * hides it inside a single request, which is why this retries here rather than
 * leaving it to the client.
 */
const PER_ATTEMPT_MS = 3000;
/** Total budget, kept under the platform's function ceiling with headroom. */
const TOTAL_BUDGET_MS = 8000;
const MAX_ATTEMPTS = 3;

/** Only ever the APOD date form. The old sanitiser stripped offending
 *  characters instead of rejecting, so "20xx" survived as "20". */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const fail = (res, status, code, message) =>
  res.status(status).json({ error: { code, message } });

export default async function handler(req, res) {
  const raw = typeof req.query.date === "string" ? req.query.date.trim() : "";
  if (raw && !DATE_RE.test(raw)) {
    return fail(res, 400, "INVALID_DATE", "Date must be formatted YYYY-MM-DD.");
  }
  const date = raw || undefined;

  const NASA_API_KEY = process.env.NASA_API_KEY;
  if (!NASA_API_KEY) {
    // Without this the key goes out as `undefined`, axios drops the param, and
    // NASA answers 403 — a confusing way to learn the env var is missing.
    return fail(res, 500, "MISSING_API_KEY", "NASA_API_KEY is not configured.");
  }

  const startedAt = Date.now();
  let last = { status: 504, code: "UPSTREAM_TIMEOUT", message: "NASA did not respond in time." };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - startedAt);
    if (remaining <= 0) break;

    try {
      const response = await axios.get("https://api.nasa.gov/planetary/apod", {
        params: { api_key: NASA_API_KEY, date },
        timeout: Math.min(PER_ATTEMPT_MS, remaining),
      });

      // Past APODs never change, so let the edge serve repeats.
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
      return res.status(200).json({
        ...response.data,
        rateLimit: {
          limit: response.headers["x-ratelimit-limit"],
          remaining: response.headers["x-ratelimit-remaining"],
          reset: response.headers["x-ratelimit-reset"],
        },
      });
    } catch (error) {
      const status = error.response?.status;

      // A 4xx is a verdict, not a hiccup — retrying it just burns the budget.
      if (status === 404) {
        return fail(res, 404, "NO_APOD_FOR_DATE", "No APOD entry exists for that date.");
      }
      if (status === 429) {
        return fail(res, 429, "OVER_RATE_LIMIT", "NASA rate limit reached.");
      }
      if (status && status < 500) {
        return fail(res, status, "UPSTREAM_REJECTED", "NASA rejected the request.");
      }

      last = status
        ? { status: 502, code: "UPSTREAM_ERROR", message: `NASA returned ${status}.` }
        : { status: 504, code: "UPSTREAM_TIMEOUT", message: "NASA did not respond in time." };

      console.warn(
        `NASA attempt ${attempt}/${MAX_ATTEMPTS} failed (${last.code}):`,
        error.response?.data || error.message,
      );
    }
  }

  return fail(res, last.status, last.code, last.message);
}
