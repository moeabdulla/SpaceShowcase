# Voice migration — November 5, 2026

Official OpenAI guidance confirms the previous `gpt-4o-mini-tts` speech endpoint is deprecated and scheduled to shut down January 6, 2027. Its recommended replacement is `gpt-realtime-2.1-mini` over the Realtime API, not a model-name swap on `/audio/speech`.

Sources:
- https://developers.openai.com/api/docs/deprecations
- https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini
- https://developers.openai.com/api/docs/guides/realtime-conversations
- https://developers.openai.com/api/docs/guides/voice-websockets?api=realtime

Pricing checked November 5: Mini text input $0.60/M tokens; audio output $20/M tokens. No microphone/audio input is used. Keep narrations to 35–55 words, use a single summarise-and-speak request rather than the old GPT-4.1 mini rewrite + speech pipeline, cap output tokens/audio size, close the connection on completion/error/cancellation, and reuse audio on replay. No cost is incurred until the visitor requests narration. The serverless handler returns a WAV compatible with the existing player/puppet; server credentials never reach the browser.

Voice: Cedar, with a warm lower-register masculine delivery. The owner requested removal of the narration-duration caption. Configured Vercel function limit 30s; upstream request budget 25s. Legacy rewrite route remains available but the app no longer calls it.

Validation: a live request with the project's existing local credential returned a valid 909,644-byte WAV (~19 seconds), with a 50-word astronomy narration based on supplied Enceladus facts. Tests cover event flow, WAV headers, failures, cancellation, timeout and length limits. No secrets or environment files were changed.
