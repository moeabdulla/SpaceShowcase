// Deterministic, lightweight stars: no resize listeners or scrolling animation.
export default function StarField() {
  return (
    <div className="sky" aria-hidden="true">
      <div className="dome-grid" />
      <div className="shooting-star" />
      <div className="shooting-star shooting-star-second" />
      {Array.from({ length: 55 }, (_, i) => (
        <i
          key={i}
          className={i % 9 === 0 ? "sky-star twinkle" : "sky-star"}
          style={{
            left: `${(i * 67.31) % 100}%`,
            top: `${(i * 37.71) % 100}%`,
            opacity: 0.2 + (i % 5) * 0.12,
            animationDelay: `${i % 7}s`,
          }}
        />
      ))}
    </div>
  );
}
