import { decode } from "he";

export const APOD_FEED = "https://science.nasa.gov/wp-json/wp/v2/apod-basic";

export function validApodDate(date) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date &&
    date >= "1995-06-16" &&
    date <= new Date().toISOString().slice(0, 10)
  );
}

export function apodEndpoint(date) {
  return date
    ? `${APOD_FEED}/${date.replaceAll("-", "").slice(2)}`
    : `${APOD_FEED}?per_page=1`;
}

// Return plain text, never insert the upstream HTML into the page.
export function plainText(html = "") {
  return decode(
    String(html)
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>|<\/p>/gi, " ")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

function mediaUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(decode(value), APOD_FEED);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href.replace(/^http:/, "https:")
      : null;
  } catch {
    return null;
  }
}

function embeddedSource(html, tag) {
  const element = String(html || "").match(
    new RegExp(`<${tag}\\b[^>]*\\bsrc\\s*=\\s*["']([^"']+)["']`, "i"),
  );
  return element ? mediaUrl(element[1]) : null;
}

export function normalizeApod(payload, requestedDate) {
  const entry = Array.isArray(payload) ? payload[0] : payload;
  if (
    !entry?.date ||
    !entry.title ||
    !entry.explanation ||
    (requestedDate && entry.date !== requestedDate)
  ) {
    throw new Error("NASA returned an incomplete or mismatched APOD entry.");
  }

  // The new `url` is an article permalink, not a renderable image/video.
  let type = "image";
  let url = embeddedSource(entry.basic_html, "img") || mediaUrl(entry.hdurl);
  if (entry.media_type === "video" || entry.media_type === "iframe") {
    const video =
      embeddedSource(entry.basic_html, "source") ||
      embeddedSource(entry.basic_html, "video");
    const iframe = embeddedSource(entry.basic_html, "iframe");
    if (video || iframe) {
      url = video || iframe;
      type = video ? "video" : "iframe";
    }
  }
  if (!url || /nasa-logo|news-thumbnail/i.test(url))
    throw new Error("NASA returned no usable media for this entry.");

  return {
    date: entry.date,
    title: plainText(entry.title),
    explanation: plainText(entry.explanation)
      .replace(/^(?:Explanation:\s*)+/i, "")
      .replace(/Tomorrow['’]s picture:[\s\S]*$/i, "")
      .trim(),
    media_type: type,
    url,
    hdurl: /nasa-logo|news-thumbnail/i.test(entry.hdurl || "")
      ? url
      : mediaUrl(entry.hdurl) || url,
    permalink: mediaUrl(entry.permalink || entry.url),
    copyright: plainText(entry.copyright || entry.credit),
    alt:
      !entry.alt || /^See Explanation/i.test(entry.alt)
        ? plainText(entry.title)
        : plainText(entry.alt),
  };
}
