import { useState, useEffect, useRef } from "react";
import useAudioLogic from "./useAudioLogic";

/**
 * Codes the server marks as worth another attempt. A missing entry is included
 * because each attempt rolls a fresh date, so the next try asks for a
 * different day rather than the same gap.
 */
const RETRYABLE = new Set([
  "INVALID_APOD",
  "UPSTREAM_TIMEOUT",
  "UPSTREAM_ERROR",
  "OVER_RATE_LIMIT",
  "NO_APOD_FOR_DATE",
]);
const MAX_TRIES = 3;
const FIRST_APOD = "1995-06-16";

export default function useSpaceObservation() {
  const requestId = useRef(0);
  const narrationAbort = useRef(null);
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Kept apart from `error` so a failed narration cannot blank out an image
  // that loaded perfectly well.
  const [ttsError, setTtsError] = useState(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false); // Track image load status

  // TTS audio for this image
  const [expertAudioUrl, setExpertAudioUrl] = useState(null);

  useEffect(
    () => () => {
      if (expertAudioUrl) URL.revokeObjectURL(expertAudioUrl);
    },
    [expertAudioUrl],
  );

  // Is TTS loading?
  const [ttsLoading, setTtsLoading] = useState(false);

  // Audio logic
  const {
    isAudioPlaying,
    isSpeaking,
    playAudio,
    stopAudio,
    togglePlayPause,
    prepareAudio,
  } = useAudioLogic();

  useEffect(() => {
    fetchRandomImage();
    return () => {
      // This ref is an async request counter, not a captured DOM node.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestId.current++;
      narrationAbort.current?.abort();
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Grab a random NASA image
   */
  const fetchRandomImage = async () => {
    const id = ++requestId.current;
    narrationAbort.current?.abort();
    // Reset states
    stopAudio();
    setExpertAudioUrl(null);
    setTtsLoading(false);
    setImageData(null);
    setLoading(true);
    setError(null);
    setTtsError(null);
    setIsImageLoaded(false); // Reset image loaded state

    const today = new Date().toISOString().split("T")[0];
    let message = "Failed to fetch image. Please try again.";

    for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
      if (id !== requestId.current) return;
      if (attempt > 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 400 * (attempt - 1)),
        );
      }

      let response;
      try {
        response = await fetch(
          `/api/nasa?date=${getRandomDate(FIRST_APOD, today)}`,
        );
      } catch {
        message = "Network error. Please try again.";
        continue;
      }

      if (id !== requestId.current) return;
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (id !== requestId.current) return;
        if (data?.url && data?.title && data?.explanation) {
          showMedia(data, id);
          return;
        }
        message =
          "NASA returned an unreadable entry. Please try another image.";
        continue;
      }

      // A platform-level failure (the function being killed mid-stall) answers
      // with plain text, not JSON. Parsing that unguarded threw a SyntaxError
      // that reached the user as "Unexpected token 'A'".
      const body = await response.json().catch(() => null);
      const code = body?.error?.code;
      message = body?.error?.message || `Request failed (${response.status}).`;

      // An unreadable body means the platform answered, not the handler — that
      // is the stall case, so it is worth another attempt.
      if (code !== undefined && !RETRYABLE.has(code)) break;
    }

    if (id !== requestId.current) return;
    setError(message);
    setLoading(false);
  };

  /** Keep the viewing window in its loading state until the source is ready. */
  const showMedia = (data, id) => {
    setImageData(data);

    if (data.media_type !== "image") {
      setLoading(false);
      setIsImageLoaded(true); // For videos, consider it "loaded"
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (id !== requestId.current) return;
      setLoading(false);
      setIsImageLoaded(true);
    };
    img.onerror = () => {
      if (id !== requestId.current) return;
      setImageData(null);
      console.error("Failed to load image for getting dimensions");
      setLoading(false);
      setError("There was an issue loading the image details.");
    };
    img.src = data.url;
  };

  /**
   * Handle Expert Explanation button
   */
  const generateNarration = async () => {
    if (!imageData) return;
    prepareAudio();

    if (expertAudioUrl) {
      startPuppetAndPlay(expertAudioUrl);
      return;
    }

    const id = requestId.current;
    narrationAbort.current = new AbortController();
    stopAudio();
    setTtsLoading(true);
    setTtsError(null);

    try {
      // Summarise and speak in a single short Realtime Mini request.
      const ttsResp = await fetch("/api/generateTTS", {
        signal: narrationAbort.current.signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: imageData.title,
          explanation: imageData.explanation,
        }),
      });
      if (!ttsResp.ok) {
        const body = await ttsResp.json().catch(() => null);
        throw new Error(
          body?.error || "Audio narration is temporarily unavailable.",
        );
      }

      const audioBlob = await ttsResp.blob();
      if (id !== requestId.current) return;
      const newAudioUrl = URL.createObjectURL(audioBlob);
      setExpertAudioUrl(newAudioUrl);

      // Start puppet + audio
      startPuppetAndPlay(newAudioUrl);
    } catch (err) {
      if (id !== requestId.current) return;
      setTtsError(err.message || "Error generating the audio explanation.");
      console.error(err);
    } finally {
      if (id === requestId.current) setTtsLoading(false);
    }
  };

  // Start puppet and audio in one step
  function startPuppetAndPlay(url) {
    playAudio(url);
  }

  function getRandomDate(startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const randomTime = start + Math.random() * (end - start);
    return new Date(randomTime).toISOString().split("T")[0];
  }

  return {
    imageData,
    loading,
    error,
    ttsError,
    isImageLoaded,
    ttsLoading,
    isAudioPlaying,
    isSpeaking,
    expertAudioUrl,
    fetchRandomImage,
    generateNarration,
    togglePlayPause,
  };
}
