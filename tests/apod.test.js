import test from "node:test";
import assert from "node:assert/strict";
import { apodEndpoint, normalizeApod, validApodDate } from "../lib/apod.js";

const entry = {
  date: "2014-03-04",
  title: "Sun &amp; Prominence",
  media_type: "image",
  url: "https://science.nasa.gov/image-article/apod-sun/",
  hdurl: "https://assets.science.nasa.gov/sun.jpg?w=960&#038;h=700",
  explanation:
    '<strong>Explanation:</strong> The Sun&#8217;s <a href="https://nasa.gov">prominence</a>.<br><strong>Tomorrow\'s picture:</strong> stars',
};

test("NASA migration: use date path, not ignored date query", () => {
  assert.equal(
    apodEndpoint("2014-03-04"),
    "https://science.nasa.gov/wp-json/wp/v2/apod-basic/140304",
  );
});
test("new image schema uses media URL and plain explanation, not article permalink", () => {
  const result = normalizeApod(entry, entry.date);
  assert.equal(
    result.url,
    "https://assets.science.nasa.gov/sun.jpg?w=960&h=700",
  );
  assert.equal(result.permalink, entry.url);
  assert.equal(result.title, "Sun & Prominence");
  assert.equal(result.explanation, "The Sun’s prominence.");
});
test("handles latest feed array and does not pass raw HTML to the browser", () => {
  assert.equal(normalizeApod([entry]).date, entry.date);
  assert.equal("basic_html" in normalizeApod(entry), false);
});
test("direct video and YouTube iframe are distinct renderers", () => {
  const video = normalizeApod({
    ...entry,
    media_type: "video",
    basic_html:
      '<video><source src="https://assets.science.nasa.gov/space.mp4"></video>',
  });
  assert.equal(video.media_type, "video");
  assert.match(video.url, /space.mp4$/);
  const iframe = normalizeApod({
    ...entry,
    media_type: "video",
    basic_html: '<iframe src="//www.youtube.com/embed/example?rel=0"></iframe>',
  });
  assert.equal(iframe.media_type, "iframe");
  assert.equal(iframe.url, "https://www.youtube.com/embed/example?rel=0");
});
test("reject missing media, logos and wrong-date responses", () => {
  assert.throws(() => normalizeApod({ ...entry, hdurl: undefined }));
  assert.throws(() =>
    normalizeApod({
      ...entry,
      hdurl: "https://science.nasa.gov/nasa-logo.png",
    }),
  );
  assert.throws(() => normalizeApod(entry, "2014-03-05"));
});
test("reject impossible dates and out-of-archive dates", () => {
  for (const date of [
    "2025-02-30",
    "2026-13-01",
    "1995-06-15",
    "2099-01-01",
    "20xx",
  ])
    assert.equal(validApodDate(date), false, date);
  assert.equal(validApodDate("1995-06-16"), true);
});

test("archive image wins over NASA's generic featured thumbnail", () => {
  const result = normalizeApod({
    ...entry,
    hdurl: "https://assets.science.nasa.gov/news-thumbnail.png",
    basic_html: '<IMG SRC="https://assets.science.nasa.gov/1995/e_lens.gif">',
  });
  assert.equal(result.url, "https://assets.science.nasa.gov/1995/e_lens.gif");
  assert.equal(result.hdurl, result.url);
});
