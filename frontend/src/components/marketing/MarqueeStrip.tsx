const WORDS = ["PROPRETÉ", "RAPIDITÉ", "QUALITÉ", "SOIN", "CONFIANCE"];

/**
 * Continuous gold marquee — a loud, confident band that breaks up the page
 * rhythm between the quiet navy hero and the warm linen sections below.
 * Duplicated content lets the track loop seamlessly at -50%.
 */
export function MarqueeStrip() {
  const items = [...WORDS, ...WORDS];
  return (
    <div className="overflow-hidden whitespace-nowrap bg-gold py-3" aria-hidden="true">
      <div className="animate-marquee inline-block">
        {items.map((word, i) => (
          <span key={i} className="mx-7 font-display text-sm font-bold tracking-wide text-navy-deep">
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
