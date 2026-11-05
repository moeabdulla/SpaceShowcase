import "./App.css";
import NasaImage from "./components/NasaImage";
import Footer from "./components/Footer";
import StarField from "./components/StarField";
import { TbTelescope, TbArrowUpRight } from "react-icons/tb";

export default function App() {
  return (
    <div className="observatory">
      <StarField />
      <a className="skip-link" href="#observation">
        Skip to observation
      </a>
      <header className="site-header shell">
        <a href="/" className="wordmark" aria-label="Space Showcase home">
          <span className="brand-icon">
            <TbTelescope />
          </span>
          <span>
            SPACE<span className="wordmark-light"> SHOWCASE</span>
          </span>
        </a>
        <a
          className="archive-link"
          href="https://science.nasa.gov/apod/archive/"
          target="_blank"
          rel="noreferrer"
        >
          A window into the universe <TbArrowUpRight />
        </a>
      </header>
      <main className="shell">
        <section className="intro" aria-labelledby="intro-title">
          <div>
            <p className="eyebrow">
              <span className="status-dot" /> THE OBSERVATORY IS OPEN
            </p>
            <h1 id="intro-title">
              A little curiosity. <em>An infinite universe.</em>
            </h1>
          </div>
          <span className="orbital-mark" aria-hidden="true">
            ✦
          </span>
        </section>
        <NasaImage />
      </main>
      <Footer />
    </div>
  );
}
