// src/components/NasaImage.jsx

import { useState, useEffect } from "react";
import ExpertPuppet from "./ExpertPuppet";
import useAudioLogic from "../hooks/useAudioLogic";
import ImagePlaceholder from "./ImagePlaceholder"; // Import the placeholder
import {
  TbMoodSpark,
  TbLoader2,
  TbPlayerPlay,
  TbPlayerPause,
  TbPlayerTrackNext,
  TbRefreshAlert,
} from "react-icons/tb";

/**
 * Codes the server marks as worth another attempt. A missing entry is included
 * because each attempt rolls a fresh date, so the next try asks for a
 * different day rather than the same gap.
 */
const RETRYABLE = new Set([
  "UPSTREAM_TIMEOUT",
  "UPSTREAM_ERROR",
  "OVER_RATE_LIMIT",
  "NO_APOD_FOR_DATE",
]);
const MAX_TRIES = 3;
const FIRST_APOD = "1995-06-16";

function NasaImage() {
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Kept apart from `error` so a failed narration cannot blank out an image
  // that loaded perfectly well.
  const [ttsError, setTtsError] = useState(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false); // Track image load status
  const [imageAspectRatio, setImageAspectRatio] = useState(null);

  // TTS audio for this image
  const [expertAudioUrl, setExpertAudioUrl] = useState(null);

  // Is TTS loading?
  const [ttsLoading, setTtsLoading] = useState(false);

  // Whether puppet is visible (slides in)
  const [hasExpertStarted, setHasExpertStarted] = useState(false);

  // Audio logic
  const {
    isAudioPlaying,
    setIsAudioPlaying,
    isSpeaking,
    setIsSpeaking,
    playAudio,
    stopAudio,
    togglePlayPause,
  } = useAudioLogic();

  useEffect(() => {
    fetchRandomImage();
    return () => {
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Grab a random NASA image
   */
  const fetchRandomImage = async () => {
    // Reset states
    setHasExpertStarted(false);
    setIsSpeaking(false);
    setIsAudioPlaying(false);
    stopAudio();
    setExpertAudioUrl(null);
    setImageData(null);
    setLoading(true);
    setError(null);
    setTtsError(null);
    setIsImageLoaded(false); // Reset image loaded state
    setImageAspectRatio(null);

    const today = new Date().toISOString().split("T")[0];
    let message = "Failed to fetch image. Please try again.";

    for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
      if (attempt > 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt - 1)));
      }

      let response;
      try {
        response = await fetch(`/api/nasa?date=${getRandomDate(FIRST_APOD, today)}`);
      } catch {
        message = "Network error. Please try again.";
        continue;
      }

      if (response.ok) {
        showMedia(await response.json());
        return;
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

    setError(message);
    setLoading(false);
  };

  /** Show an APOD entry, sizing the placeholder from the real media first. */
  const showMedia = (data) => {
    setImageData(data);

    if (data.media_type !== "image") {
      setImageAspectRatio(9 / 16); // Default 16:9 for videos
      setLoading(false);
      setIsImageLoaded(true); // For videos, consider it "loaded"
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImageAspectRatio(img.naturalHeight / img.naturalWidth);
      setLoading(false);
    };
    img.onerror = () => {
      console.error("Failed to load image for getting dimensions");
      setLoading(false);
      setError("There was an issue loading the image details.");
    };
    img.src = data.url;
  };

  /**
   * Handle Expert Explanation button
   */
  const handleRewriteAndTTS = async () => {
    if (!imageData) return;

    if (expertAudioUrl) {
      startPuppetAndPlay(expertAudioUrl);
      return;
    }

    stopAudio();
    setTtsLoading(true);
    setTtsError(null);

    try {
      // Rewrite explanation
      const rewriteResp = await fetch("/api/rewriteExplanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ explanation: imageData.explanation }),
      });
      if (!rewriteResp.ok) {
        throw new Error("Failed to rewrite explanation");
      }
      const { newExplanation } = await rewriteResp.json();

      // Generate TTS
      const ttsResp = await fetch("/api/generateTTS", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Hello, I'm your cosmic scientist. Here's the photo titled "${imageData.title}". ${newExplanation}`,
          voice: "nova",
        }),
      });
      if (!ttsResp.ok) {
        throw new Error("Failed to generate TTS audio");
      }

      const audioBlob = await ttsResp.blob();
      const newAudioUrl = URL.createObjectURL(audioBlob);
      setExpertAudioUrl(newAudioUrl);

      // Start puppet + audio
      startPuppetAndPlay(newAudioUrl);
    } catch (err) {
      setTtsError(err.message || "Error generating the audio explanation.");
      console.error(err);
    } finally {
      setTtsLoading(false);
    }
  };

  // Start puppet and audio in one step
  function startPuppetAndPlay(url) {
    setHasExpertStarted(true);
    playAudio(url);
  }

  function getRandomDate(startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const randomTime = start + Math.random() * (end - start);
    return new Date(randomTime).toISOString().split("T")[0];
  }

  // Debug: see if isSpeaking changes
  //   useEffect(() => {
  //     console.log("isSpeaking changed:", isSpeaking);
  //   }, [isSpeaking]);

  return (
    <div className="NasaImage text-white relative">
      <h1 className="text-2xl text-center sm:text-left">The Space Showcase</h1>

      {/* Next Image Button */}
      <button
        // Wrapped, not passed directly: as a bare handler the click event
        // arrived as the function's first argument, which used to be the
        // retry counter.
        onClick={() => fetchRandomImage()}
        disabled={loading}
        className="group bg-green-300 text-black w-24 h-14 rounded-xl 
                   fixed bottom-10 inset-x-0 mx-auto flex items-center 
                   justify-center text-4xl sm:inset-auto sm:bottom-auto 
                   sm:right-10 sm:top-10 duration-200 hover:cursor-pointer 
                   sm:hover:bg-green-400 sm:active:bg-green-500 z-50"
      >
        <div className={loading ? "animate-spin" : ""}>
          <div className="sm:group-hover:text-[2.7rem] duration-300 ease-in-out">
            {loading ? <TbLoader2 /> : <TbPlayerTrackNext />}
          </div>
        </div>
      </button>

      {/* Expert Explanation Button */}
      {imageData && (
        <button
          onClick={handleRewriteAndTTS}
          disabled={ttsLoading || loading}
          className={`group z-50 bg-blue-300 text-black w-24 h-14 
                      fixed bottom-10 left-5 sm:top-28 sm:right-10 
                      sm:left-auto rounded-xl text-4xl flex items-center
                      justify-center duration-200 hover:cursor-pointer 
                      sm:hover:bg-blue-400 sm:active:bg-blue-500 text-md 
                      mt-4 ml-2 ${!ttsLoading ? " animate-rainbow-ring" : ""}`}
        >
          <div className={ttsLoading ? "animate-spin" : ""}>
            <div className="sm:group-hover:rotate-12 duration-300 ease-in-out">
              {!ttsError ? (
                ttsLoading ? (
                  <TbLoader2 />
                ) : (
                  <TbMoodSpark />
                )
              ) : (
                <TbRefreshAlert />
              )}
            </div>
          </div>
        </button>
      )}

      {/* Play/Pause Button if puppet is visible */}
      {hasExpertStarted && (
        <button
          onClick={togglePlayPause}
          className="bg-gray-300 text-black w-14 h-14 rounded-full ml-2 
                     fixed bottom-28 left-9 sm:top-28 sm:right-40 
                     sm:left-auto flex items-center justify-center text-3xl 
                     duration-200 hover:cursor-pointer sm:hover:bg-gray-400 
                     sm:active:bg-gray-500 text-md z-50 mt-4"
        >
          {isAudioPlaying ? <TbPlayerPause /> : <TbPlayerPlay />}
        </button>
      )}

      {/* Error */}
      {error && !imageData && (
        <p style={{ color: "red" }} className="absolute top-20 left-10">
          Error: {error}
        </p>
      )}

      {/* A failed narration used to be invisible — the gate above hid it
          whenever an image was on screen, so the only hint was the button
          icon changing. */}
      {ttsError && (
        <p className="fixed bottom-28 left-5 right-5 sm:left-auto sm:right-10 sm:top-48 sm:bottom-auto sm:max-w-xs z-50 rounded-lg bg-red-900/80 px-3 py-2 text-sm text-red-100">
          {ttsError}
        </p>
      )}

      {/* Show placeholder or NASA Image/Video */}
      {(loading || (imageData && !isImageLoaded)) && (
        <ImagePlaceholder aspectRatio={imageAspectRatio} />
      )}

      {imageData && (
        <div
          className="flex flex-col w-full h-full items-center justify-center pt-5 sm:pt-0 transition-opacity duration-500"
          style={{
            opacity: isImageLoaded ? 1 : 0,
            visibility: isImageLoaded ? "visible" : "hidden",
          }}
        >
          <h2 className="text-3xl text-center">{imageData.title}</h2>
          <p className="text-lg text-center">{imageData.date}</p>
          <div className="py-7 w-fit h-fit">
            {imageData.media_type === "image" ? (
              <img
                className="sm:max-h-[500px] hover:scale-105 duration-500 
                           hover:cursor-pointer hover:shadow-2xl shadow-lg 
                           border-[3px]"
                src={imageData.url}
                alt={imageData.title}
                onClick={() => window.open(imageData.url, "_blank")}
                onLoad={() => setIsImageLoaded(true)}
              />
            ) : (
              <div className="aspect-video">
                <iframe
                  className="w-[300px] h-[150px] sm:w-[1000px] sm:h-[500px]"
                  src={imageData.url}
                  title={imageData.title}
                  allow="autoplay; encrypted-media"
                  frameBorder="0"
                  allowFullScreen
                  onLoad={() => setIsImageLoaded(true)}
                ></iframe>
              </div>
            )}
          </div>
          <div className={`${hasExpertStarted ? "sm:pr-[128px]" : ""}`}>
            <p className="sm:max-w-[1100px] text-xl lg:text-2xl sm:px-20 lg:px-32">
              {imageData.explanation}
            </p>
          </div>
        </div>
      )}

      {/* Puppet Area */}
      <ExpertPuppet isVisible={hasExpertStarted} isSpeaking={isSpeaking} />
    </div>
  );
}

export default NasaImage;
