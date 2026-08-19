/**
 * Small-caps, letter-spaced label with diamond-bullet separators between
 * words — pulled directly from the WEDEMBOYZ logo's own tagline treatment
 * ("PROPRETÉ ◆ RAPIDITÉ ◆ QUALITÉ"), not a generic dashboard eyebrow style.
 * Pass words as separate strings; a diamond renders between each.
 */
export function EyebrowLabel({ words }: { words: string[] }) {
  return (
    <p className="font-display flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-ink-muted">
      {words.map((word, index) => (
        <span key={word} className="flex items-center gap-2">
          {index > 0 && <span className="text-gold">&#9670;</span>}
          {word}
        </span>
      ))}
    </p>
  );
}
