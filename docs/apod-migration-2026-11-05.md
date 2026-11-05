# APOD migration repair — November 5, 2026

The deployed /api/nasa returned HTTP 200 but `title: NASA Science` and a NASA logo URL for both current and historical dates. The legacy API scraped redirected pages after NASA moved APOD.

NASA's official migration notice: https://github.com/nasa/apod-api#readme
Replacement feed: https://science.nasa.gov/wp-json/wp/v2/apod-basic

The new feed uses `/YYMMDD` for individual days (`?date=...` silently returns the latest 25 entries). `url` is now the article permalink. The adapter preserves the frontend's small data contract: actual image source, readable explanation, source link and credits. Videos extract the source/iframe from NASA's basic HTML; raw HTML is never rendered. Historic actual image sources take precedence over generic featured thumbnails. This feed requires no NASA_API_KEY; narration still uses the existing OpenAI configuration.

Validation: npm test; npm run lint; npm run build. Live upstream handler checks: 1995-06-16, 2001-02-11, 2014-03-04, 2026-10-28 (MP4), 2026-10-18 (YouTube), 2026-11-05. Browser verified random archive image loading and Next on a local production build. Changes local until approved to publish.
