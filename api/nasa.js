import axios from "axios";

import { apodEndpoint, normalizeApod, validApodDate } from "../lib/apod.js";

// NASA retired the original scraper API after moving APOD to NASA Science.
// Keep a bounded retry budget, but consume the new structured feed directly.
const PER_ATTEMPT_MS = 3000;
/** Total budget, kept under the platform's function ceiling with headroom. */
const TOTAL_BUDGET_MS = 8000;
const MAX_ATTEMPTS = 3;

const fail = (res, status, code, message) =>
  res.status(status).json({ error: { code, message } });

export default async function handler(req, res) {
  const raw = typeof req.query.date === "string" ? req.query.date.trim() : "";
  if (raw && !validApodDate(raw)) {
    return fail(res, 400, "INVALID_DATE", "Choose an APOD date from 1995-06-16 through today (YYYY-MM-DD).");
  }
  const date = raw || undefined;

  const startedAt = Date.now();
  let last = { status: 504, code: "UPSTREAM_TIMEOUT", message: "NASA did not respond in time." };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - startedAt);
    if (remaining <= 0) break;

    try {
      const response = await axios.get(apodEndpoint(date), {
        timeout: Math.min(PER_ATTEMPT_MS, remaining),
      });

      let entry;
      try {
        entry = normalizeApod(response.data, date);
      } catch {
        return fail(res, 502, "INVALID_APOD", "NASA returned an unavailable entry. Please try another image.");
      }
      res.setHeader("Cache-Control", date
        ? "public, s-maxage=86400, stale-while-revalidate=604800"
        : "public, s-maxage=300, stale-while-revalidate=600");
      return res.status(200).json(entry);
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
        error.code || error.message,
      );
    }
  }

  return fail(res, last.status, last.code, last.message);
}
