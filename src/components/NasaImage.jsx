import { useRef } from "react";
import PropTypes from "prop-types";
import {
  TbArrowUpRight,
  TbArrowsMaximize,
  TbArrowRight,
  TbPlayerPlay,
  TbPlayerPause,
  TbLoader2,
  TbVolume,
  TbX,
  TbTelescope,
  TbRefresh,
} from "react-icons/tb";
import useSpaceObservation from "../hooks/useSpaceObservation";
import ExpertPuppet from "./ExpertPuppet";

function InstrumentButton({ children, className = "", ...props }) {
  return (
    <button className={`instrument-button ${className}`} {...props}>
      {children}
    </button>
  );
}
InstrumentButton.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

export default function NasaImage() {
  const view = useSpaceObservation();
  const {
    imageData: entry,
    loading,
    error,
    ttsError,
    isImageLoaded,
    ttsLoading,
    isAudioPlaying,
    isSpeaking,
    expertAudioUrl,
  } = view;
  const dialog = useRef(null);
  const busy = loading || (!!entry && !isImageLoaded);
  const date =
    entry &&
    new Date(`${entry.date}T12:00:00`).toLocaleDateString("en", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const listen = () =>
    expertAudioUrl ? view.togglePlayPause() : view.generateNarration();
  return (
    <section
      className="observation"
      id="observation"
      aria-label="Space observation"
      aria-busy={busy}
    >
      <div className="observation-toolbar">
        <span className="eyebrow">
          <span className="tiny-cross">+</span> YOUR WINDOW TO THE COSMOS
        </span>
        <span className="archive-tag">NASA / APOD ARCHIVE</span>
      </div>
      <div className="viewing-window">
        {busy && (
          <div className="observation-loading" role="status">
            <div className="telescope-loader">
              <TbTelescope />
              <span />
            </div>
            <p>Finding your next discovery</p>
            <span>A little light, travelling a long way.</span>
          </div>
        )}
        {error && !entry && (
          <div className="observation-loading error-state" role="alert">
            <TbTelescope />
            <h2>A cloudy moment.</h2>
            <p>{error}</p>
            <InstrumentButton onClick={view.fetchRandomImage}>
              <TbRefresh /> Try again
            </InstrumentButton>
          </div>
        )}
        {entry && !busy && (
          <>
            {entry.media_type === "image" ? (
              <img
                className="observation-image"
                src={entry.url}
                alt={entry.alt || entry.title}
              />
            ) : entry.media_type === "video" ? (
              <video
                key={entry.url}
                className="observation-video"
                src={entry.url}
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <iframe
                className="observation-video"
                key={entry.url}
                src={entry.url}
                title={entry.title}
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            )}
            {entry.media_type === "image" && (
              <>
                <div className="image-vignette" />
                <button
                  className="viewing-expand"
                  onClick={() => dialog.current.showModal()}
                  aria-label="Expand image"
                  aria-haspopup="dialog"
                >
                  <span className="expand-button">
                    <TbArrowsMaximize />
                    <span>Take a closer look</span>
                  </span>
                </button>
                <div className="window-caption">
                  <span className="eyebrow">IN THE VIEWFINDER</span>
                  <h2>{entry.title}</h2>
                  <p>{date}</p>
                </div>
              </>
            )}
          </>
        )}
        <span className="window-corner top-left" aria-hidden="true" />
        <span className="window-corner bottom-right" aria-hidden="true" />
      </div>
      <div className="discovery-bar">
        <div>
          <span className="gold-spark" aria-hidden="true">
            ✦
          </span>
          <p>
            There’s always more out there.
            <span>Let chance choose your next destination.</span>
          </p>
        </div>
        <InstrumentButton
          className="primary-button"
          aria-label={
            busy ? "Finding your next discovery" : "Another discovery"
          }
          onClick={view.fetchRandomImage}
          disabled={busy}
        >
          {busy ? (
            <TbLoader2 className="spin" />
          ) : (
            <>
              Another discovery <TbArrowRight />
            </>
          )}
        </InstrumentButton>
      </div>
      <div className="observation-bottom">
        <aside
          className={`guide-card ${isAudioPlaying ? "guide-active" : ""}`}
          aria-label="Audio guide"
        >
          <div className="guide-card-top">
            <span className="eyebrow">YOUR COSMIC COMPANION</span>
            <TbVolume />
          </div>
          <div className="guide-portrait">
            <ExpertPuppet isSpeaking={isSpeaking} />
            <span className="portrait-star star-one" aria-hidden="true">
              ✦
            </span>
            <span className="portrait-star star-two" aria-hidden="true">
              +
            </span>
          </div>
          <div className="guide-copy">
            <h2>
              A universe of questions.
              <br />A friend to explain it.
            </h2>
            <p>
              Get the short story behind this discovery, told by your cosmic
              guide.
            </p>
            <InstrumentButton
              className="listen-button"
              onClick={listen}
              disabled={!entry || busy || ttsLoading}
            >
              {ttsLoading ? (
                <TbLoader2 className="spin" />
              ) : isAudioPlaying ? (
                <TbPlayerPause />
              ) : (
                <TbPlayerPlay />
              )}
              {ttsLoading
                ? "Preparing your story…"
                : isAudioPlaying
                  ? "Pause the story"
                  : expertAudioUrl
                    ? "Play the story"
                    : "Listen to the story"}
              <span
                className={`audio-wave ${isAudioPlaying ? "playing" : ""}`}
                aria-hidden="true"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <i key={i} />
                ))}
              </span>
            </InstrumentButton>
            {ttsError && (
              <p className="narration-error" role="alert">
                {ttsError}
              </p>
            )}
          </div>
        </aside>
        <article className="observation-story" aria-live="polite">
          <p className="eyebrow">THE STORY BEHIND THE VIEW</p>
          {entry && !busy ? (
            <>
              <h2>{entry.title}</h2>
              <p className="story-date">From the archive · {date}</p>
              <p className="explanation">{entry.explanation}</p>
              <div className="source-row">
                {entry.copyright && (
                  <p>
                    {entry.copyright.replace(
                      /^Image\s*Credit\s*(?:&\s*Copyright)?\s*:?\s*/i,
                      "",
                    )}
                  </p>
                )}
                {entry.permalink && (
                  <a href={entry.permalink} target="_blank" rel="noreferrer">
                    Read on NASA <TbArrowUpRight />
                  </a>
                )}
              </div>
            </>
          ) : (
            <p className="story-placeholder">
              Every view has a story. Yours is on its way.
            </p>
          )}
        </article>
      </div>
      <dialog
        ref={dialog}
        className="image-dialog"
        aria-label="Expanded space image"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <button
          className="dialog-close"
          onClick={() => dialog.current.close()}
          aria-label="Close expanded image"
        >
          <TbX />
        </button>
        {entry && (
          <>
            <img src={entry.url} alt={entry.alt || entry.title} />
            <div>
              <p>{entry.title}</p>
              <a
                href={entry.hdurl || entry.url}
                target="_blank"
                rel="noreferrer"
              >
                Open original <TbArrowUpRight />
              </a>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
