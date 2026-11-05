import { generateNarration } from "../lib/narration.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Only POST requests are allowed." });
  }
  const { title = "Astronomy photo", explanation, text } = req.body || {};
  const source = explanation ?? text;
  if (typeof source !== "string" || !source.trim() || source.length > 12000 || typeof title !== "string" || title.length > 250) {
    return res.status(400).json({ error: "Provide a title and an explanation of up to 12,000 characters." });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "Audio narration is not configured. You can still explore the photos." });
  }
  const controller = new AbortController();
  const disconnect = () => controller.abort();
  res.once("close", disconnect);
  try {
    const { audio } = await generateNarration({
      apiKey: process.env.OPENAI_API_KEY, title, explanation: source.trim(), signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Length", audio.length);
    return res.status(200).send(audio);
  } catch (error) {
    console.warn("Narration failed:", error.message);
    if (!controller.signal.aborted && !res.headersSent) {
      return res.status(502).json({ error: "Audio narration is temporarily unavailable. Please try again." });
    }
  } finally {
    res.removeListener("close", disconnect);
  }
}
