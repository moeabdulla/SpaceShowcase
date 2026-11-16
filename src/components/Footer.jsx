import { TbArrowUpRight } from "react-icons/tb";
export default function Footer() {
  return (
    <footer className="site-footer shell">
      <span>A small place for big discoveries.</span>
      <div>
        <span>Imagery & stories from NASA APOD</span>
        <a href="https://moeabdulla.com" target="_blank" rel="noreferrer">
          Made by Mohammed <TbArrowUpRight />
        </a>
        <a
          href="https://github.com/moeabdulla/SpaceShowcase"
          target="_blank"
          rel="noreferrer"
        >
          GitHub <TbArrowUpRight />
        </a>
      </div>
    </footer>
  );
}
